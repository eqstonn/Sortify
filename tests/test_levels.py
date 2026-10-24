import pytest

from app.services.levels import LEVELS, level_for


def test_zero_points_is_the_first_level():
    level = level_for(0)
    assert level.number == 1
    assert level.name == "Seed"
    assert level.progress == 0
    assert level.points_to_next == 50


def test_first_level_starts_at_zero():
    assert LEVELS[0][0] == 0


def test_thresholds_go_up():
    needed = [n for n, _ in LEVELS]
    assert needed == sorted(set(needed))


@pytest.mark.parametrize("index", range(1, len(LEVELS)))
def test_reaching_a_threshold_levels_up(index):
    needed, name = LEVELS[index]
    assert level_for(needed - 1).number == index  # one point short: still the level before
    level = level_for(needed)
    assert level.number == index + 1
    assert level.name == name
    assert level.min_points == needed


def test_progress_halfway():
    level = level_for(225)  # Seedling is 150-300
    assert level.name == "Seedling"
    assert level.next_name == "Sapling"
    assert level.progress == 0.5
    assert level.points_to_next == 75


def test_sapling_grows_into_young_tree():
    assert level_for(599).name == "Sapling"
    assert level_for(599).next_name == "Young Tree"
    assert level_for(600).name == "Young Tree"


def test_top_level_has_no_next():
    level = level_for(1_000_000)
    assert level.number == len(LEVELS)
    assert level.next_name is None
    assert level.next_at is None
    assert level.progress == 1
    assert level.points_to_next == 0
