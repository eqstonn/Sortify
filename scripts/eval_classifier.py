"""Run every photo in tests/eval_images/ through the real Gemini and print accuracy.

Put photos in a folder named after the category they should be, e.g.
    tests/eval_images/aluminum_can/coke.jpg
    tests/eval_images/battery/aa.jpg

Run from the project root (uses your real GEMINI_API_KEY, so it costs a little):
    python -m scripts.eval_classifier
"""

import sys
from pathlib import Path

from app.services import gemini, images, rules

EVAL_DIR = Path(__file__).resolve().parents[1] / "tests" / "eval_images"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def main() -> int:
    known = set(rules.category_ids()) | {gemini.UNKNOWN_ID}
    photos = []
    for folder in sorted(p for p in EVAL_DIR.iterdir() if p.is_dir()):
        if folder.name not in known:
            print(f"Skipping folder '{folder.name}': not a category id")
            continue
        photos += [(f, folder.name) for f in sorted(folder.iterdir()) if f.suffix.lower() in IMAGE_SUFFIXES]

    if not photos:
        print(f"No photos found. Add some to {EVAL_DIR}/<category_id>/")
        return 1

    right_category = right_bin = 0
    for path, expected in photos:
        try:
            answer = gemini.classify(images.prepare_image(path.read_bytes()))
        except (images.InvalidImage, gemini.GeminiError) as e:
            print(f"ERROR  {path.relative_to(EVAL_DIR)}: {e}")
            continue

        # Getting the bin right matters most, even if the exact category is off
        same_bin = rules.get_disposal(answer.category_id).bin == rules.get_disposal(expected).bin
        right_category += answer.category_id == expected
        right_bin += same_bin
        mark = "ok   " if answer.category_id == expected else ("~bin " if same_bin else "WRONG")
        print(f"{mark}  {path.relative_to(EVAL_DIR)}: got {answer.category_id} "
              f"({answer.item}, {answer.confidence:.2f}), expected {expected}")

    n = len(photos)
    print(f"\nCategory accuracy: {right_category}/{n} = {right_category / n:.0%}")
    print(f"Bin accuracy:      {right_bin}/{n} = {right_bin / n:.0%}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
