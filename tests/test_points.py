from app.services import points, rules
from tests.conftest import make_photo


def jpeg_hash(**kwargs) -> str:
    return points.photo_hash(make_photo(**kwargs))


# ---------- same photo twice ----------


def test_same_photo_resized_is_a_duplicate():
    big = jpeg_hash(width=2000, height=1500, seed=1)
    small = jpeg_hash(width=800, height=600, seed=1)
    assert points.is_duplicate(small, [big])


def test_different_photos_are_not_duplicates():
    assert not points.is_duplicate(jpeg_hash(seed=1), [jpeg_hash(seed=2), jpeg_hash(seed=3)])


def test_nothing_earlier_means_no_duplicate():
    assert not points.is_duplicate(jpeg_hash(seed=1), [])


# ---------- scoring ----------


def test_base_points_come_from_categories_json():
    assert points.points_for("aluminum_can", corrected=False, first_time=False) == 10


def test_first_time_bonus():
    assert points.points_for("aluminum_can", corrected=False, first_time=True) == 10 + points.FIRST_CATEGORY_BONUS


def test_rare_items_earn_more():
    assert points.points_for("battery", False, False) > points.points_for("aluminum_can", False, False)


def test_corrected_scan_cant_earn_rare_points():
    assert rules.load_categories()["battery"].points > points.CORRECTED_MAX_POINTS
    assert points.points_for("battery", corrected=True, first_time=True) == points.CORRECTED_MAX_POINTS


def test_corrected_cheap_item_keeps_its_points():
    assert points.points_for("chip_bag", corrected=True, first_time=False) == 2


def test_garbage_keeps_nothing_out_of_landfill():
    assert points.kg_for("chip_bag") == 0
    assert points.kg_for("glass_bottle_jar") > 0


# ---------- daily cap (same rule as award_points in SQL) ----------


def test_cap_not_reached():
    assert points.apply_daily_cap(10, earned_today=50, cap=200) == 10


def test_cap_trims_the_last_scan():
    assert points.apply_daily_cap(40, earned_today=190, cap=200) == 10


def test_cap_already_reached():
    assert points.apply_daily_cap(40, earned_today=200, cap=200) == 0
