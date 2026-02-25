from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from typing import Optional
from app.services.s3 import upload_file_to_s3

router = APIRouter()

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    x_firebase_uid: Optional[str] = Header(None),
):
    """
    Upload a profile picture to S3.
    Returns the URL of the uploaded image.
    """
    if not x_firebase_uid:
        raise HTTPException(
            status_code=401,
            detail="Missing Firebase UID header",
        )

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    # Check file size (read and check)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    # Reset file position for upload
    await file.seek(0)

    try:
        url = await upload_file_to_s3(file, folder=f"profile-pictures/{x_firebase_uid}")
        return {"url": url}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}",
        )


@router.post("/color-analysis-photo")
async def upload_color_analysis_photo(
    file: UploadFile = File(...),
    x_firebase_uid: Optional[str] = Header(None),
):
    """
    Upload a color analysis photo to S3.
    Returns the URL of the uploaded image.
    """
    if not x_firebase_uid:
        raise HTTPException(
            status_code=401,
            detail="Missing Firebase UID header",
        )

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    # Check file size (read and check)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    # Reset file position for upload
    await file.seek(0)

    try:
        url = await upload_file_to_s3(file, folder=f"color-analysis/{x_firebase_uid}")
        return {"url": url}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}",
        )
