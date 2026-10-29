"""Request and response shapes. These double as the contract for the Expo app."""

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Bin(str, Enum):
    BLUE = "blue_bin"
    BLACK = "black_bin"
    GREEN = "green_bin"
    GARBAGE = "garbage"
    DROPOFF = "dropoff"
    UNSURE = "unsure"


class DropoffType(str, Enum):
    ELECTRONICS = "electronics"
    BATTERIES = "batteries"
    HAZARDOUS = "hazardous"


class Category(BaseModel):
    """One entry in data/categories.json."""

    id: str
    name: str
    material: str
    bin: Bin
    dropoff_type: DropoffType | None = None
    points: int = Field(ge=0)
    rarity: str  # "common", "uncommon" or "rare"
    kg_estimate: float = Field(gt=0)
    tips: list[str] = Field(min_length=1)
    examples: list[str] = []
    # True when a teammate still needs to check this against ottawa.ca
    verify: bool = False


class DropoffSite(BaseModel):
    """One entry in data/dropoff_sites.json."""

    id: str
    name: str
    address: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    accepts: list[DropoffType] = Field(min_length=1)
    notes: str = ""
    verify: bool = False


class NearestDropoff(BaseModel):
    site: DropoffSite
    distance_km: float


class Disposal(BaseModel):
    """What the result screen needs to tell someone where an item goes."""

    category_id: str
    name: str
    material: str
    recyclable: bool
    bin: Bin
    dropoff_type: DropoffType | None = None
    points: int
    tips: list[str]


class ClassifyResult(Disposal):
    """Response of POST /classify: everything the result screen shows."""

    item: str  # what Gemini saw, e.g. "Coke can"; the bin still comes from category_id
    confidence: float = Field(ge=0, le=1)
    scan_id: str | None = None  # pass to /scans/{id}/confirm or /correct
    nearest_dropoff: NearestDropoff | None = None


class ScanStatus(str, Enum):
    PENDING = "pending"  # scanned, not yet "I recycled it"
    CONFIRMED = "confirmed"


class ScanOut(BaseModel):
    """One row of GET /scans/me."""

    id: str
    category_id: str  # after any correction
    name: str
    item: str
    bin: Bin
    corrected: bool
    status: ScanStatus
    points_awarded: int
    created_at: datetime
    confirmed_at: datetime | None = None


class CorrectIn(BaseModel):
    """Body of POST /scans/{id}/correct: the category the player picked."""

    category_id: str
    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)


class ConfirmResult(BaseModel):
    """Response of POST /scans/{id}/confirm."""

    scan_id: str
    category_id: str
    points_awarded: int
    total_points: int
    notes: list[str]  # e.g. "+15 first-time bonus", "daily limit reached"
    new_badges: list[str] = []  # badge ids earned by this scan, e.g. ["first_sort"]


# ---------- leaderboard ----------


class LeaderboardRange(str, Enum):
    WEEK = "week"  # since Monday, Ottawa time
    ALL = "all"


class LeaderboardEntry(BaseModel):
    rank: int  # players with equal points share a rank
    user_id: str
    name: str
    avatar: str
    points: int
    is_me: bool = False


class LeaderboardOut(BaseModel):
    """Response of GET /leaderboard."""

    range: LeaderboardRange
    entries: list[LeaderboardEntry]  # top 20
    me: LeaderboardEntry | None  # your row even if you're not in the top 20; None until you score


# ---------- profile ----------


class Level(BaseModel):
    """The Home plant's level and the progress bar to the next one."""

    number: int  # 1 = Seed
    name: str
    min_points: int
    next_name: str | None  # None at the top level
    next_at: int | None
    points_to_next: int
    progress: float = Field(ge=0, le=1)


class MaterialShare(BaseModel):
    """One bar of "What you sort"."""

    material: str
    count: int
    percent: int


class Avatar(str, Enum):
    SPROUT = "sprout"
    LEAF = "leaf"
    TREE = "tree"
    CACTUS = "cactus"
    FLOWER = "flower"
    MUSHROOM = "mushroom"
    BEE = "bee"
    FOX = "fox"
    OWL = "owl"
    TURTLE = "turtle"


class Weekday(str, Enum):
    # In date.weekday() order, so list(Weekday)[0] is Monday
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"


class Schedule(BaseModel):
    pickup_day: Weekday
    blue_week_of: date  # the Monday of a week when the blue bin went out


class BadgeOut(BaseModel):
    """One badge on the Me screen, earned or still locked."""

    id: str
    name: str
    description: str
    earned: bool
    earned_at: datetime | None = None


class ProfileOut(BaseModel):
    """Response of GET /me and PATCH /me: the Home and Me screens."""

    id: str
    name: str
    avatar: str
    total_points: int
    level: Level
    items_sorted: int
    kg_diverted: float
    items_this_week: int
    current_streak: int  # days in a row with a confirmed scan, up to today or yesterday
    longest_streak: int
    rank: int | None  # all-time Ottawa rank; None until you score
    breakdown: list[MaterialShare]  # most-sorted material first
    schedule: Schedule | None  # None until PUT /me/schedule
    badges: list[BadgeOut]  # every badge, earned ones first


class ProfileUpdate(BaseModel):
    """Body of PATCH /me. Leave out what you don't want to change."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(None, min_length=1, max_length=30)
    avatar: Avatar | None = None


# ---------- pickup schedule ----------


class RecyclingWeek(str, Enum):
    BLUE = "blue_bin"
    BLACK = "black_bin"


class ScheduleIn(BaseModel):
    """Body of PUT /me/schedule."""

    pickup_day: Weekday
    this_week: RecyclingWeek  # which recycling bin goes out this week (Mon-Sun)


class NextPickup(BaseModel):
    """Response of GET /schedule/next: the Home "Up next" banner."""

    pickup_date: date
    days_away: int  # 0 = today
    bins: list[Bin]  # e.g. ["black_bin", "green_bin"]
    label: str  # e.g. "Black + green bin · Tue, Oct 27"
    holiday: str | None = None  # set when a holiday moved this pickup


# ---------- Sortify Wrapped ----------


class MaterialCount(BaseModel):
    """One row of the Wrapped "top material" card."""

    material: str
    count: int
    top_items: list[str]  # most-sorted category names in this material, up to 2


class RarestFind(BaseModel):
    category_id: str
    name: str  # category name, e.g. "Battery"
    item: str  # what Gemini saw, e.g. "old laptop battery"
    material: str
    bin: Bin
    rarity: str
    percent_of_players: int  # share of this month's players who sorted one too


class TopRecycler(BaseModel):
    user_id: str
    name: str
    avatar: str
    points: int  # this month
    is_me: bool


class WrappedOut(BaseModel):
    """Response of GET /wrapped/{year}/{month}: data for the 5 Wrapped cards."""

    year: int
    month: int
    items: int
    kg: float
    average_kg: float  # per player who sorted anything this month
    points: int
    top_materials: list[MaterialCount]  # top 5, most sorted first
    rarest_find: RarestFind | None
    rank: int | None  # by points this month; None if you scored nothing
    players: int  # players who sorted something this month
    top_recycler: TopRecycler | None
    busiest_day: str | None  # weekday you sorted most, e.g. "sunday"
    longest_streak: int  # longest run of days that touches this month, counted in full


# ---------- Discover weekly ----------


class DiscoverItem(BaseModel):
    """One entry in data/discover_weekly.json."""

    category_id: str
    item: str  # e.g. "Greasy pizza box"
    bonus_points: int = Field(gt=0)
    explainer: str


class DiscoverOut(BaseModel):
    """Response of GET /discover/current."""

    week_of: date  # Monday
    ends_on: date  # Sunday
    category_id: str
    item: str
    name: str  # category name
    bin: Bin
    bonus_points: int
    explainer: str
    tips: list[str]
    found: bool  # you already sorted it this week (the bonus is used)
