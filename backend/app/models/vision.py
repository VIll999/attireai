from pydantic import BaseModel, Field
from typing import Optional


class ColorAnalysisRequest(BaseModel):
    photo_base64: str = Field(..., description="Base64-encoded JPEG image (no data URI prefix)")


class ColorAnalysisResponse(BaseModel):
    skin_tone: str = Field(..., description="Detected skin tone category")
    skin_tone_hex: str = Field(..., description="Hex color of detected skin tone")
    hair_color: str = Field(..., description="Detected hair color category")
    hair_color_hex: str = Field(..., description="Hex color of detected hair color")
    confidence: Optional[float] = Field(None, description="Detection confidence 0.0-1.0")
