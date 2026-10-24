"""Who is calling? Reads the Supabase login token and returns the user id, or 401."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import Database, get_db

# Adds the "Authorize" button at /docs. The app sends
# "Authorization: Bearer <access token from supabase.auth.signInAnonymously()>"
bearer = HTTPBearer(auto_error=False, description="Supabase access token")


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Database = Depends(get_db),
) -> str:
    if creds is None:
        raise HTTPException(401, "Sign in first", headers={"WWW-Authenticate": "Bearer"})
    user_id = db.user_id_from_token(creds.credentials)
    if user_id is None:
        raise HTTPException(
            401, "Your login has expired. Sign in again.", headers={"WWW-Authenticate": "Bearer"}
        )
    return user_id
