"""App icons and the browser-tab icon: the two recycling arrows from the Sortify logo.

Draws the arrows from mobile/assets/redesign/sortify-logo.svg (the group with the
terracotta and green arcs) with Pillow, at 8x size, then shrinks them for smooth edges.

Writes, in mobile/assets/:
    favicon.png                   browser tab (transparent)
    icon.png                      iOS / default app icon (arrows on the cream page colour)
    android-icon-foreground.png   Android adaptive icon: arrows in the middle safe zone
    android-icon-background.png   Android adaptive icon: plain cream
    android-icon-monochrome.png   Android themed icon: one colour

Run: python -m scripts.build_icons
"""

from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "mobile" / "assets"

TERRACOTTA = (169, 87, 59, 255)  # #A9573B
LEAF = (94, 140, 62, 255)  # #5E8C3E
CREAM = (240, 239, 231, 255)  # #F0EFE7, the app's page colour
SUPERSAMPLE = 8

# The logo's arrow group, in its own 0-100 box: two arcs around (50, 50) with
# radius 32 and a 19-wide stroke, each ending in a triangle arrowhead.
# Angles are clockwise from 3 o'clock, like SVG's (y points down).
CENTER, RADIUS, STROKE = 50, 32, 19
ARCS = [
    (TERRACOTTA, 205.0, 318.0, [(84.18, 19.22), (80.91, 41.72), (63.38, 37.96)]),
    (LEAF, 25.0, 138.0, [(15.82, 80.78), (19.09, 58.28), (36.62, 62.04)]),
]
ART_MIN, ART_MAX = 4.0, 96.0  # how far the arrows reach in that box, heads included


def arrows(size: int, scale: float, color=None) -> Image.Image:
    """The arrows centred on a transparent square. scale: their width as a share of the square."""
    big = size * SUPERSAMPLE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    unit = big * scale / (ART_MAX - ART_MIN)  # pixels per logo unit
    offset = (big - (ART_MAX - ART_MIN) * unit) / 2 - ART_MIN * unit

    def at(x: float, y: float) -> tuple[float, float]:
        return (offset + x * unit, offset + y * unit)

    outer = RADIUS + STROKE / 2
    for fill, start, end, head in ARCS:
        ink = color or fill
        box = [at(CENTER - outer, CENTER - outer), at(CENTER + outer, CENTER + outer)]
        draw.arc(box, start, end, fill=ink, width=round(STROKE * unit))
        draw.polygon([at(x, y) for x, y in head], fill=ink)
    return img.resize((size, size), Image.LANCZOS)


def on_background(size: int, scale: float, background) -> Image.Image:
    base = Image.new("RGBA", (size, size), background)
    base.alpha_composite(arrows(size, scale))
    return base


def main() -> None:
    arrows(192, 0.92).save(ASSETS / "favicon.png")
    on_background(1024, 0.62, CREAM).convert("RGB").save(ASSETS / "icon.png")
    # Android crops adaptive icons to a circle or squircle; keep the arrows inside the middle ~60%
    arrows(512, 0.52).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGBA", (512, 512), CREAM).save(ASSETS / "android-icon-background.png")
    arrows(432, 0.52, color=(0, 0, 0, 255)).save(ASSETS / "android-icon-monochrome.png")
    print(f"Wrote icons to {ASSETS}")


if __name__ == "__main__":
    main()
