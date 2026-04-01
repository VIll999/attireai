from fastapi import APIRouter, Header, HTTPException
from app.models.vision import ColorAnalysisRequest, ColorAnalysisResponse
from app.services.vision_service import VisionService

router = APIRouter()


@router.post("/analyze-colors", response_model=ColorAnalysisResponse)
async def analyze_colors(
    request: ColorAnalysisRequest,
    x_firebase_uid: str = Header(...),
):
    """Analyze a photo to detect skin tone and hair color using Gemini Vision."""

    # Validate base64 payload size (rough check: base64 is ~33% larger than raw)
    if len(request.photo_base64) > 7 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    try:
        result = VisionService.analyze_colors(request.photo_base64)
        return ColorAnalysisResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
