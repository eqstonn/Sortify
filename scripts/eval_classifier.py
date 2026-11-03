"""Reproducible labelled-photo holdout evaluation using the REAL Gemini API.

Place independently labelled images in tests/eval_images/<category_id>/.
Run before and after a manually reviewed prompt change with the same photos:
    python -m scripts.eval_classifier --json baseline.json
    python -m scripts.eval_classifier --json after.json
Requires a configured GEMINI_API_KEY and consumes Gemini quota.
"""

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from app.services import gemini, images, rules

EVAL_DIR = Path(__file__).resolve().parents[1] / "tests" / "eval_images"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", dest="json_path", type=Path, help="Save a machine-readable report")
    parser.add_argument("--min-images", type=int, default=0, help="Fail if the set has fewer labelled images")
    args = parser.parse_args(argv)

    known = set(rules.category_ids()) | {gemini.UNKNOWN_ID}
    photos = []
    for folder in sorted(p for p in EVAL_DIR.iterdir() if p.is_dir()):
        if folder.name not in known:
            print(f"Skipping folder '{folder.name}': not a category id")
            continue
        photos += [(file, folder.name) for file in sorted(folder.iterdir()) if file.suffix.lower() in IMAGE_SUFFIXES]

    if not photos:
        print(f"No photos found. Add some to {EVAL_DIR}/<category_id>/")
        return 1
    if len(photos) < args.min_images:
        print(f"Need at least {args.min_images} labelled photos; found {len(photos)}")
        return 1

    cases = []
    for path, expected in photos:
        case = {"file": str(path.relative_to(EVAL_DIR)), "expected": expected}
        try:
            answer = gemini.classify(images.prepare_image(path.read_bytes()))
        except (images.InvalidImage, gemini.GeminiError) as exc:
            case["error"] = str(exc)
            print(f"ERROR  {case['file']}: {exc}")
            cases.append(case)
            continue

        same_category = answer.category_id == expected
        same_bin = rules.get_disposal(answer.category_id).bin == rules.get_disposal(expected).bin
        case.update({
            "predicted": answer.category_id,
            "item": answer.item,
            "confidence": answer.confidence,
            "correct_category": same_category,
            "correct_bin": same_bin,
        })
        mark = "ok" if same_category else ("~bin" if same_bin else "WRONG")
        print(f"{mark:5} {case['file']}: got {answer.category_id} "
              f"({answer.item}, {answer.confidence:.2f}), expected {expected}")
        cases.append(case)

    evaluated = [c for c in cases if "error" not in c]
    category_correct = sum(c["correct_category"] for c in evaluated)
    bin_correct = sum(c["correct_bin"] for c in evaluated)
    by_expected = defaultdict(list)
    for c in evaluated:
        by_expected[c["expected"]].append(c)
    report = {
        "total_photos": len(cases),
        "evaluated": len(evaluated),
        "errors": len(cases) - len(evaluated),
        "category_correct": category_correct,
        "bin_correct": bin_correct,
        "category_accuracy_pct": round(100 * category_correct / len(evaluated), 1) if evaluated else None,
        "bin_accuracy_pct": round(100 * bin_correct / len(evaluated), 1) if evaluated else None,
        "per_expected_category": {
            cid: {
                "evaluated": len(group),
                "correct": sum(c["correct_category"] for c in group),
            }
            for cid, group in sorted(by_expected.items())
        },
        "cases": cases,
    }
    print(f"\nEvaluated {len(evaluated)}/{len(cases)} photos; {report['errors']} API/image errors")
    print(f"Category accuracy: {category_correct}/{len(evaluated)} = "
          f"{report['category_accuracy_pct']}%")
    print(f"Bin accuracy: {bin_correct}/{len(evaluated)} = {report['bin_accuracy_pct']}%")
    if args.json_path:
        args.json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Saved {args.json_path}")
    return 0 if evaluated and not report["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
