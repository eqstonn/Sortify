"""Total points -> the Home plant's level, and how far it is to the next one."""

from app.schemas import Level

# (points needed, name). The first level must start at 0.
# One level per plant stage in the app (mobile/assets/plant/stage-1..4), so 4 levels.
# Kept low on purpose so the plant visibly grows during a demo.
LEVELS = [
    (0, "Sprout"),
    (50, "Seedling"),
    (100, "Sapling"),
    (200, "Young Tree"),
]


def level_for(points: int) -> Level:
    # The highest level whose threshold you've reached
    index = max(i for i, (needed, _) in enumerate(LEVELS) if points >= needed)
    min_points, name = LEVELS[index]

    if index + 1 == len(LEVELS):
        return Level(
            number=index + 1, name=name, min_points=min_points,
            next_name=None, next_at=None, points_to_next=0, progress=1.0,
        )

    next_at, next_name = LEVELS[index + 1]
    return Level(
        number=index + 1,
        name=name,
        min_points=min_points,
        next_name=next_name,
        next_at=next_at,
        points_to_next=next_at - points,
        progress=round((points - min_points) / (next_at - min_points), 3),
    )
