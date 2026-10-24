"""Gemini is faked here; these check our prompt, schema and answer validation."""

import json
from types import SimpleNamespace

import httpx
import pytest

from app.services import gemini, rules


def answer(**fields) -> str:
    return json.dumps(fields)


# ---------- prompt and schema ----------


def test_prompt_lists_every_category():
    prompt = gemini.build_prompt()
    for category_id in rules.category_ids():
        assert category_id in prompt
    assert gemini.UNKNOWN_ID in prompt


def test_schema_limits_gemini_to_our_ids():
    schema = gemini.response_schema()
    assert schema.properties["category_id"].enum == rules.category_ids() + ["unknown"]
    assert set(schema.required) == {"category_id", "item", "confidence"}


# ---------- answer validation ----------


def test_good_answer_passes_through():
    a = gemini.parse_answer(answer(category_id="aluminum_can", item="Coke can", confidence=0.93))
    assert a.category_id == "aluminum_can"
    assert a.item == "Coke can"
    assert a.confidence == 0.93


def test_made_up_category_becomes_unknown():
    a = gemini.parse_answer(answer(category_id="blue_bin_stuff", item="can", confidence=0.9))
    assert a.category_id == "unknown"


def test_low_confidence_becomes_unknown():
    a = gemini.parse_answer(answer(category_id="battery", item="battery?", confidence=0.2))
    assert a.category_id == "unknown"
    assert a.item == "battery?"


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
