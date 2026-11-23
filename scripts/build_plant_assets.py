"""Make the app's copies of the plant art from the redesign originals.

    python -m scripts.build_plant_assets

Reads   mobile/assets/redesign/Stage-N-transparent.png   (N = 1..4, one per level)
Writes  mobile/assets/plant/stage-N.png                    at most 1200 x 1200, transparent

The originals are up to 2048 px and ~5 MB; the plant is shown about 360 pt
wide, so 1200 px stays sharp on a 3x phone at a fraction of the size.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "mobile" / "assets" / "redesign"
OUT = ROOT / "mobile" / "assets" / "plant"

STAGES = 4
MAX_SIZE = 1200


def build_stage(n: int) -> Path:
    src = SRC / f"Stage-{n}-transparent.png"
    out = OUT / f"stage-{n}.png"
    with Image.open(src) as im:
        im = im.convert("RGBA")
        if max(im.size) > MAX_SIZE:
            im = im.resize((MAX_SIZE, MAX_SIZE * im.height // im.width), Image.LANCZOS)
        im.save(out, optimize=True)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for n in range(1, STAGES + 1):
        out = build_stage(n)
        print(f"{out.relative_to(ROOT)}  {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
