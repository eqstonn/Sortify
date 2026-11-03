"""Aggregate confirmed scans into feedback diagnostics (not ground-truth accuracy).

An uncorrected scan is *not* verified correct: many players skip mistakes.
Only final_category_id != None represents explicit user feedback.
"""

from collections import Counter, defaultdict

from app.services.gemini import REVIEW_CONFIDENCE


CONFIDENCE_RANGES = (
    ("0–49%", 0.0, 0.5),
    ("50–69%", 0.5, REVIEW_CONFIDENCE),
    ("70–84%", REVIEW_CONFIDENCE, 0.85),
    ("85–100%", 0.85, 1.01),
)


def _percentage(numerator: int, denominator: int) -> float | None:
    return round(100 * numerator / denominator, 1) if denominator else None


def _summary(scans: list[dict]) -> dict:
    reviewed = [s for s in scans if s.get("final_category_id") is not None]
    wrong = [s for s in reviewed if s["final_category_id"] != s["category_id"]]
    return {
        "confirmed_scans": len(scans),
        "corrections": len(wrong),
        "observed_uncorrected_pct": _percentage(len(scans) - len(wrong), len(scans)),
        "reviewed_scans": len(reviewed),
        "reviewed_accuracy_pct": _percentage(len(reviewed) - len(wrong), len(reviewed)),
    }


def accuracy_report(scans: list[dict]) -> dict:
    """Per-prediction-category and confidence breakdown, plus top wrong -> right pairs.

    Rows must already be confirmed. The scan's original category is never overwritten.
    """
    by_category: dict[str, list[dict]] = defaultdict(list)
    reviewed_by_actual: dict[str, list[dict]] = defaultdict(list)
    by_confidence: dict[str, list[dict]] = defaultdict(list)
    mixups: Counter[tuple[str, str]] = Counter()

    for scan in scans:
        prediction = scan["category_id"]
        by_category[prediction].append(scan)
        actual = scan.get("final_category_id")
        if actual is not None:
            reviewed_by_actual[actual].append(scan)
        if actual is not None and actual != prediction:
            mixups[(prediction, actual)] += 1
        try:
            confidence = float(scan.get("confidence") or 0)
        except (ValueError, TypeError):
            confidence = 0.0
        for label, lower, upper in CONFIDENCE_RANGES:
            if lower <= confidence < upper:
                by_confidence[label].append(scan)
                break

    per_category = [
        {"category_id": category, **_summary(rows)}
        for category, rows in by_category.items()
    ]
    per_category.sort(key=lambda row: (-row["confirmed_scans"], row["category_id"]))
    per_reported_actual_category = [
        {
            "category_id": category,
            "reviewed_scans": len(rows),
            "correctly_predicted": sum(s["category_id"] == category for s in rows),
            "reviewed_accuracy_pct": _percentage(
                sum(s["category_id"] == category for s in rows), len(rows)
            ),
        }
        for category, rows in reviewed_by_actual.items()
    ]
    per_reported_actual_category.sort(key=lambda r: (-r["reviewed_scans"], r["category_id"]))
    buckets = [
        {"bucket": label, **_summary(by_confidence[label])}
        for label, _, _ in CONFIDENCE_RANGES
    ]

    return {
        "overall": _summary(scans),
        "per_category": per_category,
        "per_reported_actual_category": per_reported_actual_category,
        "common_mixups": [
            {"predicted_category_id": predicted, "actual_category_id": actual, "count": count}
            for (predicted, actual), count in sorted(
                mixups.items(), key=lambda pair: (-pair[1], pair[0])
            )[:10]
        ],
        "confidence_buckets": buckets,
        "review_threshold": REVIEW_CONFIDENCE,
        "caveat": (
            "Uncorrected does not mean correct. Reviewed accuracy uses only user-submitted "
            "labels, which can be incorrect. This is not ground-truth model accuracy; "
            "use the separate labelled photo evaluation set for that."
        ),
    }
