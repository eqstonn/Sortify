"""Ask Gemini what's in the photo, in two steps.

1. classify(): Gemini picks a category id from our fixed list. Where the item
   goes (bin, points, tips) is looked up afterwards in rules.py, so a creative
   answer can never send someone to the wrong bin.
2. look_up(): only when nothing in the list fits but Gemini can name the item
   (a Pokémon card, a toy), a second call with Google Search finds the Ottawa
   rule for it. Gemini must answer with one of our five bins; anything else is
   ignored. The scan is then filed under other_<bin> (rules.looked_up_id), and
   the result screen shows the summary and sources as "Checked online".
"""

import json
import logging
import math
import re
from functools import lru_cache
from pathlib import Path

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

from app.config import get_settings
from app.schemas import Bin, DropoffType, OnlineCheck, OnlineSource
from app.services import rules

log = logging.getLogger(__name__)

UNKNOWN_ID = "unknown"
# Require the user to pick a category below this confidence; no automatic confirmation.
REVIEW_CONFIDENCE = 0.70
# Someone is holding their phone up waiting, so give up rather than hang
TIMEOUT_SECONDS = 30


class GeminiAnswer(BaseModel):
    category_id: str
    item: str  # Gemini's short name for the thing, e.g. "Coke can" (display only)
    confidence: float = Field(ge=0, le=1)
    alternatives: list[str] = Field(default_factory=list)
    clear_item: bool = True  # one main item Gemini can name, so it's worth looking up if unlisted


class GeminiError(RuntimeError):
    """Gemini couldn't be reached or returned an error."""


def build_prompt() -> str:
    lines = []
    for c in rules.load_categories().values():
        if rules.is_looked_up(c.id):
            continue  # other_* are only for looked-up items, never picked from a photo
        examples = ", ".join(c.examples)
        lines.append(f"- {c.id}: {c.name}" + (f" (e.g. {examples})" if examples else ""))
    category_list = "\n".join(lines)
    hint_file = Path(__file__).resolve().parents[2] / "data" / "classifier_hints.json"
    hints = json.loads(hint_file.read_text(encoding="utf-8"))["hints"]
    hint_lines = "\n".join("- " + hint for hint in hints)
    return f"""You are a recycling assistant for Ottawa, Ontario, Canada.
Look at the photo and identify the single main item in it.

Pick the category_id for the item from this list:
{category_list}
- {UNKNOWN_ID}: no clear item, several different items, or nothing above fits

Only pick a category if the item really is that kind of thing. If it is
something else (a trading card, a toy, clothing, a phone case...), answer
{UNKNOWN_ID}: never pick the closest-looking category. Sortify looks those up
separately.

Also give:
- item: what the item actually is, as specifically as you can in 2-5 words
  (e.g. "Coke can", "Pokémon trading card")
- clear_item: true if there is one main item you can name, false if the photo
  is blurry, empty, or shows several different things
- confidence: how sure you are of the category, from 0.0 to 1.0
- alternatives: up to 3 DISTINCT category IDs in descending likelihood, including
  category_id first if it is a valid category. Only use IDs from the list.
  Include plausible choices even when you are unsure; never invent category IDs.

Human-reviewed Ottawa disambiguation hints:
{hint_lines}"""


def response_schema() -> types.Schema:
    """Forces Gemini's reply into this JSON shape, with category_id limited to our ids."""
    return types.Schema(
        type=types.Type.OBJECT,
        properties={
            "category_id": types.Schema(
                type=types.Type.STRING, enum=rules.category_ids() + [UNKNOWN_ID]
            ),
            "item": types.Schema(type=types.Type.STRING),
            "confidence": types.Schema(type=types.Type.NUMBER),
            "alternatives": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING, enum=rules.category_ids()),
            ),
            "clear_item": types.Schema(type=types.Type.BOOLEAN),
        },
        required=["category_id", "item", "confidence", "alternatives", "clear_item"],
    )


@lru_cache
def get_client() -> genai.Client:
    return genai.Client(
        api_key=get_settings().gemini_api_key,
        http_options=types.HttpOptions(
            timeout=TIMEOUT_SECONDS * 1000,  # milliseconds
            retry_options=types.HttpRetryOptions(attempts=2),
        ),
    )


def ask_gemini(image: bytes) -> str:
    """The only function that talks to Google. Returns Gemini's raw JSON text.

    Tests replace this with a fake so they never hit the network.
    """
    try:
        response = get_client().models.generate_content(
            model=get_settings().gemini_model,
            contents=[types.Part.from_bytes(data=image, mime_type="image/jpeg"), build_prompt()],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema(),
                temperature=0,  # same photo, same answer
            ),
        )
    except (errors.APIError, httpx.HTTPError) as e:
        raise GeminiError(str(e)) from e
    return response.text or ""


def parse_answer(text: str) -> GeminiAnswer:
    """Turn Gemini's reply into a safe answer. Anything odd becomes "unknown"."""
    try:
        raw = json.loads(text)
    except json.JSONDecodeError:
        raw = None
    if not isinstance(raw, dict):
        return GeminiAnswer(category_id=UNKNOWN_ID, item="unknown", confidence=0)

    item = str(raw.get("item") or "unknown").strip()[:80]

    try:
        confidence = float(raw.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    if not math.isfinite(confidence):
        confidence = 0.0
    confidence = min(max(confidence, 0.0), 1.0)

    valid_ids = set(rules.category_ids())
    category_id = raw.get("category_id")
    if not isinstance(category_id, str) or category_id not in valid_ids:
        category_id = UNKNOWN_ID

    # Preserve Gemini's actual first guess even below the review threshold;
    # the app and backend require a user selection before it can be confirmed.
    # This keeps category_id useful for evaluating model confusion later.
    suggestions = []
    raw_alternatives = raw.get("alternatives")
    candidates = ([category_id] if category_id in valid_ids else []) + (
        raw_alternatives if isinstance(raw_alternatives, list) else []
    )
    for candidate in candidates:
        if isinstance(candidate, str) and candidate in valid_ids and candidate not in suggestions:
            suggestions.append(candidate)
        if len(suggestions) == 3:
            break

    clear_item = raw.get("clear_item", True) is not False  # only an explicit false says "no clear item"

    return GeminiAnswer(
        category_id=category_id, item=item, confidence=confidence, alternatives=suggestions, clear_item=clear_item
    )


def classify(image: bytes) -> GeminiAnswer:
    """Photo (already cleaned by images.prepare_image) -> validated answer."""
    return parse_answer(ask_gemini(image))


# ---------- step 2: look up an item that isn't in our list ----------

# Gemini's ways of saying "nothing to look up"
NOT_AN_ITEM = {"", "unknown", "nothing", "none", "several items", "multiple items"}
MAX_SOURCES = 3


def worth_looking_up(answer: GeminiAnswer) -> bool:
    """Nothing in our list fits, but there's one item Gemini could name."""
    return answer.category_id == UNKNOWN_ID and answer.clear_item and answer.item.strip().lower() not in NOT_AN_ITEM


def lookup_prompt(item: str) -> str:
    return f"""Search the web for how residents of Ottawa, Ontario, Canada must dispose of this item: "{item}".
Prefer the City of Ottawa's own rules (ottawa.ca, the Waste Explorer). Ottawa's bins:
- blue_bin: glass bottles and jars, metal cans, foil, plastic bottles, tubs and jugs, cartons
- black_bin: paper, cardboard, boxboard
- green_bin: food waste, soiled paper
- garbage: anything that isn't recyclable or compostable
- dropoff: electronics, batteries or household hazardous waste, taken to a drop-off site

Reply with ONLY this JSON object and nothing else:
{{"bin": "blue_bin" | "black_bin" | "green_bin" | "garbage" | "dropoff" | "unsure",
  "dropoff_type": "electronics" | "batteries" | "hazardous" | null,
  "summary": "one short sentence saying where it goes and why"}}
Use "unsure" if you can't find a clear answer."""


def ask_lookup(item: str) -> tuple[str, list[OnlineSource]]:
    """The only function that searches the web. Returns Gemini's reply text and its sources.

    Tests replace this with a fake so they never hit the network.
    """
    try:
        response = get_client().models.generate_content(
            model=get_settings().gemini_model,
            contents=lookup_prompt(item),
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0,
            ),
        )
    except (errors.APIError, httpx.HTTPError) as e:
        raise GeminiError(str(e)) from e

    sources: list[OnlineSource] = []
    candidates = response.candidates or []
    metadata = candidates[0].grounding_metadata if candidates else None
    for chunk in (metadata.grounding_chunks or []) if metadata else []:
        web = chunk.web
        if web and web.uri and len(sources) < MAX_SOURCES:
            sources.append(OnlineSource(title=(web.title or web.domain or "Source")[:80], url=web.uri))
    return response.text or "", sources


def parse_lookup(text: str, sources: list[OnlineSource]) -> OnlineCheck | None:
    """Gemini's search answer -> a bin we know, or None if it's unsure or the reply is odd."""
    match = re.search(r"\{.*\}", text, re.DOTALL)  # the JSON, even inside ```json fences
    try:
        raw = json.loads(match.group(0)) if match else None
    except json.JSONDecodeError:
        raw = None
    if not isinstance(raw, dict):
        return None

    try:
        bin_ = Bin(raw.get("bin"))
    except ValueError:
        return None
    if bin_ == Bin.UNSURE:
        return None

    dropoff_type = None
    if bin_ == Bin.DROPOFF:
        try:
            dropoff_type = DropoffType(raw.get("dropoff_type"))
        except ValueError:
            dropoff_type = None  # the app then shows the nearest site that takes anything

    summary = str(raw.get("summary") or "").strip()[:240]
    if not summary:
        return None
    return OnlineCheck(bin=bin_, dropoff_type=dropoff_type, summary=summary, sources=sources)


def look_up(item: str) -> OnlineCheck | None:
    """Where an unlisted item goes in Ottawa, found with Google Search. None if no clear answer."""
    try:
        text, sources = ask_lookup(item)
    except GeminiError as e:
        # e.g. the key's Google Search quota is used up: the player picks the category instead
        log.warning("Online lookup failed for %r: %s", item, e)
        return None
    found = parse_lookup(text, sources)
    if found is None:
        log.info("Online lookup unsure for %r", item)
    return found
