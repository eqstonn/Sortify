"""Check a running Sortify backend: GET /health, then POST /classify with a photo.

    python -m scripts.smoke_test https://sortify-api.onrender.com
    python -m scripts.smoke_test http://localhost:8000 --photo can.jpg

Signs in as a fresh test player like scripts.dev_token, so it needs
SUPABASE_URL and SUPABASE_SERVICE_KEY in .env. /classify really calls Gemini
(one request). Without --photo it sends a plain test picture: Gemini will
probably say "unknown", which still proves the whole path works (upload,
Gemini, rules, database). Prints PASS or FAIL per check; exits 1 on any FAIL.

Render's free plan sleeps after 15 idle minutes, so the first check can take
up to a minute while it wakes up.
"""

import argparse
import io
import sys
import time

import httpx
from PIL import Image, ImageDraw

from app.services import rules
from scripts.dev_token import new_player_token

WAKE_UP_SECONDS = 90  # a sleeping free Render service takes about a minute


def test_photo() -> bytes:
    """A plain stand-in photo: a grey 'can' on a light background."""
    img = Image.new("RGB", (768, 1024), (235, 240, 232))
    ImageDraw.Draw(img).rounded_rectangle((260, 220, 508, 800), radius=40, fill=(150, 160, 170))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


def check_health(client: httpx.Client) -> tuple[bool, str]:
    start = time.monotonic()
    try:
        res = client.get("/health")
    except httpx.HTTPError as e:
        return False, f"no answer ({type(e).__name__}: {e})"
    took = time.monotonic() - start
    if res.status_code != 200 or res.json() != {"status": "ok"}:
        return False, f"HTTP {res.status_code}: {res.text[:200]}"
    return True, f"ok in {took:.1f}s"


def check_classify(client: httpx.Client, token: str, photo: bytes) -> tuple[bool, str]:
    try:
        res = client.post(
            "/classify",
            files={"image": ("smoke.jpg", photo, "image/jpeg")},
            headers={"Authorization": f"Bearer {token}"},
        )
    except httpx.HTTPError as e:
        return False, f"no answer ({type(e).__name__}: {e})"
    if res.status_code != 200:
        return False, f"HTTP {res.status_code}: {res.text[:300]}"
    body = res.json()
    if body.get("category_id") not in {*rules.category_ids(), "unknown"}:
        return False, f"unexpected category: {body.get('category_id')!r}"
    if not body.get("scan_id"):
        return False, "no scan_id, so the scan wasn't saved"
    return True, f"{body['item']!r} -> {body['category_id']} ({body['bin']}, {body['confidence']:.0%} sure)"


def run(client: httpx.Client, token_fn, photo: bytes) -> bool:
    """Runs every check, prints PASS/FAIL lines, and returns True if all passed.
    token_fn is only called once /health passes, so a dead server doesn't make a player."""
    ok, detail = check_health(client)
    print(f"{'PASS' if ok else 'FAIL'}  GET /health      {detail}")
    if not ok:
        print("SKIP  POST /classify   (the server isn't up)")
        return False

    ok, detail = check_classify(client, token_fn(), photo)
    print(f"{'PASS' if ok else 'FAIL'}  POST /classify   {detail}")
    return ok


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("url", help="e.g. https://sortify-api.onrender.com")
    parser.add_argument("--photo", help="a real photo to classify (default: a plain test picture)")
    args = parser.parse_args()

    photo = open(args.photo, "rb").read() if args.photo else test_photo()
    with httpx.Client(base_url=args.url.rstrip("/"), timeout=WAKE_UP_SECONDS) as client:
        passed = run(client, lambda: new_player_token()[1], photo)
    print("\nAll checks passed." if passed else "\nSomething failed; see above.")
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
