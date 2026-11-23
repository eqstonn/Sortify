"""Gemini is faked here; these check our prompt, schema and answer validation."""

import json
from types import SimpleNamespace

import httpx
import pytest

from app.schemas import Bin, DropoffType, OnlineSource
from app.services import gemini, rules

# The real search function, kept before conftest.py swaps it for an offline fake in each test
REAL_ASK_LOOKUP = gemini.ask_lookup


def answer(**fields) -> str:
    return json.dumps(fields)


# ---------- prompt and schema ----------


def test_prompt_lists_every_category():
    prompt = gemini.build_prompt()
    for category_id in rules.category_ids():
        assert category_id in prompt
    assert gemini.UNKNOWN_ID in prompt
    assert "other_garbage" not in prompt


def test_schema_limits_gemini_to_our_ids():
    schema = gemini.response_schema()
    assert schema.properties["category_id"].enum == rules.category_ids() + ["unknown"]
    assert set(schema.required) == {"category_id", "item", "confidence", "alternatives", "clear_item"}


# ---------- answer validation ----------


def test_good_answer_passes_through():
    a = gemini.parse_answer(answer(category_id="aluminum_can", item="Coke can", confidence=0.93))
    assert a.category_id == "aluminum_can"
    assert a.item == "Coke can"
    assert a.confidence == 0.93


def test_made_up_category_becomes_unknown():
    a = gemini.parse_answer(answer(category_id="blue_bin_stuff", item="can", confidence=0.9))
    assert a.category_id == "unknown"


def test_low_confidence_preserves_guess_for_user_review():
    a = gemini.parse_answer(answer(category_id="battery", item="battery?", confidence=0.2))
    assert a.category_id == "battery"
    assert a.item == "battery?"
    assert a.confidence < gemini.REVIEW_CONFIDENCE
    assert a.alternatives == ["battery"]


def test_alternatives_are_valid_deduplicated_and_capped():
    a = gemini.parse_answer(answer(category_id="battery", item="cells", confidence=0.4,
                                   alternatives=["battery", "fake", "paper", "aluminum_can", "glass_bottle"]))
    assert a.alternatives == ["battery", "paper", "aluminum_can"]


@pytest.mark.parametrize("text", ["", "not json", "[1, 2]", "null"])
def test_broken_reply_becomes_unknown(text):
    a = gemini.parse_answer(text)
    assert a.category_id == "unknown"
    assert a.confidence == 0


@pytest.mark.parametrize("raw, expected", [(1.7, 1.0), (-3, 0.0), ("high", 0.0), (None, 0.0)])
def test_confidence_is_kept_between_0_and_1(raw, expected):
    a = gemini.parse_answer(answer(category_id="paper", item="paper", confidence=raw))
    assert a.confidence == expected


def test_missing_item_name_is_filled_in():
    a = gemini.parse_answer(answer(category_id="paper", confidence=0.9))
    assert a.item == "unknown"


# ---------- the call itself, with a fake client ----------


class FakeModels:
    def __init__(self, reply=None, error=None):
        self.reply, self.error, self.calls = reply, error, []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(text=self.reply)


def use_fake_client(monkeypatch, models):
    monkeypatch.setattr(gemini, "get_client", lambda: SimpleNamespace(models=models))


def test_classify_sends_photo_with_schema(monkeypatch):
    models = FakeModels(reply=answer(category_id="carton", item="Milk carton", confidence=0.8))
    use_fake_client(monkeypatch, models)

    result = gemini.classify(b"jpeg bytes")

    assert result.category_id == "carton"
    config = models.calls[0]["config"]
    assert config.response_mime_type == "application/json"
    assert config.response_schema.properties["category_id"].enum[-1] == "unknown"


def test_network_problem_becomes_gemini_error(monkeypatch):
    use_fake_client(monkeypatch, FakeModels(error=httpx.ConnectError("no internet")))
    with pytest.raises(gemini.GeminiError):
        gemini.classify(b"jpeg bytes")


def test_blocked_reply_with_no_text_is_unknown(monkeypatch):
    use_fake_client(monkeypatch, FakeModels(reply=None))
    assert gemini.classify(b"jpeg bytes").category_id == "unknown"


# ---------- step 1: is there one item worth looking up? ----------


def test_clear_item_defaults_to_true_and_only_explicit_false_counts():
    assert gemini.parse_answer('{"category_id": "unknown", "item": "toy car", "confidence": 0.9}').clear_item
    assert not gemini.parse_answer(
        '{"category_id": "unknown", "item": "several items", "confidence": 0.9, "clear_item": false}'
    ).clear_item


@pytest.mark.parametrize(
    "category_id, item, clear, expected",
    [
        ("unknown", "Pokémon trading card", True, True),
        ("unknown", "Pokémon trading card", False, False),  # blurry or several things
        ("unknown", "unknown", True, False),  # nothing to search for
        ("aluminum_can", "Coke can", True, False),  # already in our list
    ],
)
def test_only_nameable_unlisted_items_are_looked_up(category_id, item, clear, expected):
    answer = gemini.GeminiAnswer(category_id=category_id, item=item, confidence=0.8, clear_item=clear)
    assert gemini.worth_looking_up(answer) is expected


# ---------- step 2: the online lookup ----------

SOURCE = OnlineSource(title="Waste Explorer", url="https://ottawa.ca/wasteexplorer")


def test_lookup_answer_becomes_a_bin_with_its_summary_and_sources():
    text = '{"bin": "garbage", "dropoff_type": null, "summary": "Trading cards are plastic-coated, so they go in the garbage."}'
    check = gemini.parse_lookup(text, [SOURCE])
    assert check.bin == Bin.GARBAGE
    assert check.summary.startswith("Trading cards")
    assert check.sources == [SOURCE]


def test_lookup_json_inside_code_fences_or_chatter_still_parses():
    text = 'Here you go:\n```json\n{"bin": "blue_bin", "summary": "Rinse it."}\n```'
    assert gemini.parse_lookup(text, []).bin == Bin.BLUE


@pytest.mark.parametrize(
    "text",
    [
        '{"bin": "unsure", "summary": "Not clear."}',  # Gemini isn't sure: we don't guess
        '{"bin": "compost_heap", "summary": "Somewhere."}',  # not one of our bins
        '{"bin": "garbage", "summary": "  "}',  # no explanation
        "I couldn't find anything.",  # no JSON at all
        "{broken json",
    ],
)
def test_unsure_or_odd_lookups_are_dropped(text):
    assert gemini.parse_lookup(text, []) is None


def test_dropoff_lookup_keeps_a_valid_kind_and_drops_an_invalid_one():
    ok = gemini.parse_lookup('{"bin": "dropoff", "dropoff_type": "batteries", "summary": "Take it to a battery drop-off."}', [])
    assert ok.dropoff_type == DropoffType.BATTERIES
    odd = gemini.parse_lookup('{"bin": "dropoff", "dropoff_type": "space", "summary": "Drop-off."}', [])
    assert odd.bin == Bin.DROPOFF and odd.dropoff_type is None


def test_lookup_that_cant_reach_google_gives_none():
    # conftest.py makes every lookup fail unless a test fakes it
    assert gemini.look_up("Pokémon trading card") is None


def test_lookup_searches_google_and_collects_sources(monkeypatch):
    seen = {}

    def generate_content(**kwargs):
        seen.update(kwargs)
        web = SimpleNamespace(uri="https://ottawa.ca/wasteexplorer", title="Waste Explorer", domain="ottawa.ca")
        metadata = SimpleNamespace(grounding_chunks=[SimpleNamespace(web=web), SimpleNamespace(web=None)])
        return SimpleNamespace(
            text='{"bin": "garbage", "summary": "Garbage."}',
            candidates=[SimpleNamespace(grounding_metadata=metadata)],
        )

    client = SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))
    monkeypatch.setattr(gemini, "get_client", lambda: client)

    text, sources = REAL_ASK_LOOKUP("Pokémon trading card")

    assert "Pokémon trading card" in seen["contents"]
    assert seen["config"].tools[0].google_search is not None  # Google Search is switched on
    assert text == '{"bin": "garbage", "summary": "Garbage."}'
    assert sources == [OnlineSource(title="Waste Explorer", url="https://ottawa.ca/wasteexplorer")]
