"""Photo clean-up before anything else sees it: shrink it and strip EXIF (GPS location!)."""

import io

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_SIDE = 1024  # plenty for Gemini to recognise an item, and much faster to upload
JPEG_QUALITY = 85


class InvalidImage(ValueError):
    """The upload isn't a photo Pillow can read."""


def prepare_image(data: bytes, max_side: int = MAX_SIDE) -> bytes:
    """Return a small, metadata-free JPEG.

    Phones save photos sideways and record the rotation in EXIF, so we apply
    that rotation first, then re-save without any EXIF at all.
    """
    try:
        with Image.open(io.BytesIO(data)) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")  # drops transparency so it can be saved as JPEG
            img.thumbnail((max_side, max_side))  # keeps aspect ratio, never upscales
            out = io.BytesIO()
            # No exif= argument, so the new file carries no metadata
            img.save(out, format="JPEG", quality=JPEG_QUALITY)
            return out.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise InvalidImage("That file isn't an image we can read.") from e
