"""Ask Gemini what's in the photo.

Gemini only picks a category id from our fixed list. Where the item goes (bin,
points, tips) is looked up afterwards in rules.py, so a creative answer from
Gemini can never send someone to the wrong bin.
"""

import json
import math
from functools import lru_cache

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services import rules

UNKNOWN_ID = "unknown"
# Below this we'd rather say "not sure" than guess the wrong bin
MIN_CONFIDENCE = 0.5
# Someone is holding their phone up waiting, so give up rather than hang
TIMEOUT_SECONDS = 30


class GeminiAnswer(BaseModel):
    category_id: str
    item: str  # Gemini's short name for the thing, e.g. "Coke can" (display only)
    confidence: float = Field(ge=0, le=1)


class GeminiError(RuntimeError):
    """Gemini couldn't be reached or returned an error."""


def build_prompt() -> str:
    lines = []
    for c in rules.load_categories().values():
        examples = ", ".join(c.examples)
        lines.append(f"- {c.id}: {c.name}" + (f" (e.g. {examples})" if examples else ""))
    category_list = "\n".join(lines)
    return f"""You are a recycling assistant for Ottawa, Ontario, Canada.
Look at the photo and identify the single main item in it.

Pick the category_id that best matches the item from this list:
{category_list}
- {UNKNOWN_ID}: no clear item, several different items, or nothing above fits

Also give:
- item: a short name for what you see (2-4 words, e.g. "Coke can")
- confidence: how sure you are of the category, from 0.0 to 1.0"""


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
        },
        required=["category_id", "item", "confidence"],
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

    category_id = raw.get("category_id")
    if category_id not in rules.category_ids() or confidence < MIN_CONFIDENCE:
        category_id = UNKNOWN_ID

    return GeminiAnswer(category_id=category_id, item=item, confidence=confidence)


def classify(image: bytes) -> GeminiAnswer:
    """Photo (already cleaned by images.prepare_image) -> validated answer."""
    return parse_answer(ask_gemini(image))
