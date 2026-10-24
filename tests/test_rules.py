import pytest

from app.schemas import Bin, DropoffSite, DropoffType
from app.services import rules

# ---------- data file checks ----------


def test_categories_file_loads():
    categories = rules.load_categories()
    assert len(categories) >= 25


def test_every_category_is_complete():
    for c in rules.load_categories().values():
        assert c.bin != Bin.UNSURE, c.id
        assert c.points > 0, c.id
        assert c.tips and all(t.strip() for t in c.tips), c.id
        assert c.rarity in {"common", "uncommon", "rare"}, c.id


def test_dropoff_categories_say_which_kind():
    for c in rules.load_categories().values():
        if c.bin == Bin.DROPOFF:
            assert c.dropoff_type is not None, c.id
        else:
            assert c.dropoff_type is None, c.id


def test_every_dropoff_type_has_a_site():
    needed = {c.dropoff_type for c in rules.load_categories().values() if c.dropoff_type}
    for kind in needed:
        assert rules.nearest_dropoff(45.42, -75.69, kind) is not None, kind


def test_rare_items_are_worth_more_than_common():
    cats = rules.load_categories().values()
    max_common = max(c.points for c in cats if c.rarity == "common")
    min_rare = min(c.points for c in cats if c.rarity == "rare")
    assert min_rare > max_common


def test_every_site_is_valid():
    for s in rules.load_sites():
        assert s.address.strip()
        # Roughly the Ottawa area
        assert 44.9 < s.lat < 45.6 and -76.4 < s.lon < -75.2, s.id


# ---------- Ottawa spot checks ----------


@pytest.mark.parametrize(
    "category_id, expected_bin",
    [
        ("aluminum_can", Bin.BLUE),
        ("glass_bottle_jar", Bin.BLUE),
        ("plastic_bottle", Bin.BLUE),
        ("carton", Bin.BLUE),
        ("cardboard", Bin.BLACK),
        ("paper", Bin.BLACK),
        ("greasy_pizza_box", Bin.GREEN),
        ("food_scraps", Bin.GREEN),
        ("chip_bag", Bin.GARBAGE),
        ("battery", Bin.DROPOFF),
        ("electronics", Bin.DROPOFF),
    ],
)
def test_ottawa_bins(category_id, expected_bin):
    assert rules.get_disposal(category_id).bin == expected_bin


def test_recyclable_flag():
    assert rules.get_disposal("aluminum_can").recyclable is True
    assert rules.get_disposal("food_scraps").recyclable is True  # composting counts
    assert rules.get_disposal("battery").recyclable is True
    assert rules.get_disposal("chip_bag").recyclable is False


def test_unknown_category_is_safe():
    d = rules.get_disposal("definitely_not_a_category")
    assert d.bin == Bin.UNSURE
    assert d.recyclable is False
    assert d.points == 0
    assert d.tips


def test_category_ids_is_the_fixed_list():
    ids = rules.category_ids()
    assert "aluminum_can" in ids
    assert len(ids) == len(set(ids))


# ---------- nearest drop-off ----------

SITES = [
    DropoffSite(id="west", name="West", address="1 West St", lat=45.35, lon=-75.90,
                accepts=[DropoffType.ELECTRONICS]),
    DropoffSite(id="east", name="East", address="1 East St", lat=45.44, lon=-75.55,
                accepts=[DropoffType.ELECTRONICS, DropoffType.BATTERIES]),
]


def test_nearest_picks_closest():
    # Orleans is in the east end
    result = rules.nearest_dropoff(45.47, -75.51, sites=SITES)
    assert result.site.id == "east"
    assert result.distance_km < 10


def test_nearest_respects_what_site_accepts():
    # Kanata is closer to "west", but only "east" takes batteries
    result = rules.nearest_dropoff(45.31, -75.91, DropoffType.BATTERIES, sites=SITES)
    assert result.site.id == "east"


def test_nearest_none_when_nothing_accepts():
    assert rules.nearest_dropoff(45.4, -75.7, DropoffType.HAZARDOUS, sites=SITES) is None


def test_distance_is_sane():
    # Parliament Hill to Ottawa airport is about 11 km
    km = rules.distance_km(45.4236, -75.7009, 45.3225, -75.6692)
    assert 10 < km < 13
