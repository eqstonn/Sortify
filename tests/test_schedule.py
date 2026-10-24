"""Next pickup: weekdays, blue/black alternating and holiday shifts. No holidays unless a test adds them."""

from datetime import date

from app.schemas import Bin
from app.services import schedule
from app.services.clock import week_start

TUESDAY = 1
BLUE_WEEK = date(2026, 10, 19)  # a Monday


def next_pickup(today, pickup_day=TUESDAY, blue_week_of=BLUE_WEEK, holidays=None):
    return schedule.next_pickup(today, pickup_day, blue_week_of, holidays or {})


def test_week_starts_monday():
    assert week_start(date(2026, 10, 25)) == date(2026, 10, 19)  # Sunday -> Monday before
    assert week_start(date(2026, 10, 19)) == date(2026, 10, 19)


def test_before_pickup_day_is_this_week():
    pickup = next_pickup(date(2026, 10, 19))  # Monday
    assert pickup.pickup_date == date(2026, 10, 20)
    assert pickup.days_away == 1


def test_on_pickup_day_is_today():
    pickup = next_pickup(date(2026, 10, 20))
    assert pickup.pickup_date == date(2026, 10, 20)
    assert pickup.days_away == 0


def test_day_after_is_next_week():
    pickup = next_pickup(date(2026, 10, 21))
    assert pickup.pickup_date == date(2026, 10, 27)
    assert pickup.days_away == 6


def test_blue_and_black_alternate():
    assert next_pickup(date(2026, 10, 20)).bins == [Bin.BLUE, Bin.GREEN]
    assert next_pickup(date(2026, 10, 27)).bins == [Bin.BLACK, Bin.GREEN]
    assert next_pickup(date(2026, 11, 3)).bins == [Bin.BLUE, Bin.GREEN]


def test_alternates_before_the_reference_week_too():
    assert next_pickup(date(2026, 10, 13)).bins[0] == Bin.BLACK
    assert next_pickup(date(2026, 10, 6)).bins[0] == Bin.BLUE


def test_label_matches_the_mockup():
    assert next_pickup(date(2026, 10, 24)).label == "Black + green bin · Tue, Oct 27"


def test_holiday_moves_pickup_a_day():
    thanksgiving = {date(2026, 10, 12): "Thanksgiving"}  # Monday
    pickup = next_pickup(date(2026, 10, 12), blue_week_of=date(2026, 10, 12), holidays=thanksgiving)
    assert pickup.pickup_date == date(2026, 10, 14)  # usually Tue Oct 13
    assert pickup.holiday == "Thanksgiving"
    assert pickup.bins[0] == Bin.BLUE  # still that week's bin


def test_holiday_later_in_the_week_doesnt_move_earlier_pickup():
    friday_holiday = {date(2026, 10, 23): "Made-up Day"}
    pickup = next_pickup(date(2026, 10, 19), holidays=friday_holiday)
    assert pickup.pickup_date == date(2026, 10, 20)
    assert pickup.holiday is None


def test_two_holidays_move_it_two_days():
    holidays = {date(2027, 12, 27): "Christmas (observed)", date(2027, 12, 28): "Boxing Day (observed)"}
    pickup = next_pickup(date(2027, 12, 27), pickup_day=1, holidays=holidays)
    assert pickup.pickup_date == date(2027, 12, 30)


def test_shifted_pickup_still_counts_after_usual_day():
    # Usual day Tue Oct 13 has passed, but the shifted pickup Wed Oct 14 is today
    thanksgiving = {date(2026, 10, 12): "Thanksgiving"}
    pickup = next_pickup(date(2026, 10, 14), holidays=thanksgiving)
    assert pickup.pickup_date == date(2026, 10, 14)


def test_holiday_file_loads():
    holidays = schedule.load_holidays()
    assert holidays[date(2026, 10, 12)] == "Thanksgiving"
    # The real file shifts the plan's example: Tue Oct 13 -> Wed Oct 14
    assert schedule.next_pickup(date(2026, 10, 12), TUESDAY, BLUE_WEEK).pickup_date == date(2026, 10, 14)
