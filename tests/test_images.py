import io

import pytest
from PIL import Image

from app.services import images
from tests.conftest import make_photo

GPS_IFD = 0x8825
ORIENTATION = 0x0112


def open_result(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))


def test_big_photo_is_shrunk_keeping_shape():
    out = open_result(images.prepare_image(make_photo(4000, 3000)))
    assert out.format == "JPEG"
    assert out.size == (1024, 768)


def test_small_photo_is_not_enlarged():
    out = open_result(images.prepare_image(make_photo(300, 200)))
    assert out.size == (300, 200)


def test_location_and_other_exif_are_removed():
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"  # camera make
    exif.get_ifd(GPS_IFD)[2] = (45.0, 25.0, 0.0)  # latitude
    original = make_photo(exif=exif)
    assert GPS_IFD in Image.open(io.BytesIO(original)).getexif()  # the test photo really has it

    out = open_result(images.prepare_image(original))
    assert len(out.getexif()) == 0


def test_sideways_phone_photo_is_rotated_upright():
    exif = Image.Exif()
    exif[ORIENTATION] = 6  # "rotate 90 degrees to display", as phones do
    out = open_result(images.prepare_image(make_photo(2000, 1000, exif=exif)))
    assert out.size == (512, 1024)  # now portrait


def test_png_with_transparency_works():
    img = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    assert open_result(images.prepare_image(buf.getvalue())).mode == "RGB"


@pytest.mark.parametrize("data", [b"not an image", b"\xff\xd8\xff broken jpeg"])
def test_garbage_bytes_raise_invalid_image(data):
    with pytest.raises(images.InvalidImage):
        images.prepare_image(data)
