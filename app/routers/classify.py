"""POST /classify: photo in, result screen out."""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.db import Database, get_db
from app.deps import get_current_user
from app.schemas import ClassifyResult
from app.services import gemini, images, points, rules

log = logging.getLogger(__name__)
router = APIRouter(tags=["scan"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # phone photos are usually 2-5 MB


@router.post("/classify", response_model=ClassifyResult)
def classify(
    image: UploadFile = File(...),
    # Optional phone location, used to find the nearest drop-off for batteries etc.
    lat: float | None = Form(None, ge=-90, le=90),
    lon: float | None = Form(None, ge=-180, le=180),
    user_id: str = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    data = image.file.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(400, "Empty image")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image is too big (max 10 MB)")

    try:
        photo = images.prepare_image(data)
    except images.InvalidImage as e:
        raise HTTPException(400, str(e))

    try:
        answer = gemini.classify(photo)
    except gemini.GeminiError as e:
        log.warning("Gemini error: %s", e)
        raise HTTPException(502, "The scanner is having trouble right now. Try again in a moment.")

    # The bin comes from our rules, never from Gemini's own words
    disposal = rules.get_disposal(answer.category_id)

    nearest = None
    if disposal.dropoff_type and lat is not None and lon is not None:
        nearest = rules.nearest_dropoff(lat, lon, disposal.dropoff_type)

    # Saved as "pending": no points until the player taps "I recycled it"
    scan = db.insert_scan(
        {
            "user_id": user_id,
            "category_id": answer.category_id,
            "item": answer.item,
            "confidence": answer.confidence,
            "image_hash": points.photo_hash(photo),
        }
    )

    log.info("Scan: %r -> %s (%.2f)", answer.item, disposal.category_id, answer.confidence)
    return ClassifyResult(
        **disposal.model_dump(),
        item=answer.item,
        confidence=answer.confidence,
        scan_id=scan["id"],
        nearest_dropoff=nearest,
    )
