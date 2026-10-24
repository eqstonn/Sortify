
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import categories, classify, leaderboard, profile, scans, schedule


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="Sortify API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.include_router(categories.router)
    app.include_router(classify.router)
    app.include_router(scans.router)
    app.include_router(leaderboard.router)
    app.include_router(profile.router)
    app.include_router(schedule.router)
    return app


app = create_app()
