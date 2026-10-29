
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import categories, classify, discover, leaderboard, profile, scans, schedule, wrapped

logger = logging.getLogger("sortify")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="Sortify API", version="0.1.0")

    # A crash normally skips the CORS middleware, so the browser blocks the reply and the
    # app can only say "Can't reach Sortify". Catching it in here (inside CORS, because
    # middleware added first runs innermost) turns it into a normal 500 the app can show.
    @app.middleware("http")
    async def server_errors_as_json(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            logger.exception("%s %s crashed", request.method, request.url.path)
            return JSONResponse(status_code=500, content={"detail": f"Server error: {exc}"})

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
    app.include_router(wrapped.router)
    app.include_router(discover.router)
    return app


app = create_app()
