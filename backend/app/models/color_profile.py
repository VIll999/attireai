from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ColorProfileCreate(BaseModel):
    """Create or update a color profile."""
    skin_tone: Optional[str] = None
    skin_tone_hex: Optional[str] = None
    hair_color: Optional[str] = None
    hair_color_hex: Optional[str] = None
    recommended_palette: Optional[Dict[str, Any]] = None
    photo_url: Optional[str] = None


class ColorProfileUpdate(BaseModel):
    """Update a color profile."""
    skin_tone: Optional[str] = None
    skin_tone_hex: Optional[str] = None
    hair_color: Optional[str] = None
    hair_color_hex: Optional[str] = None
    recommended_palette: Optional[Dict[str, Any]] = None
    photo_url: Optional[str] = None


class ColorProfileResponse(BaseModel):
    id: str
    user_id: str
    skin_tone: Optional[str] = None
    skin_tone_hex: Optional[str] = None
    hair_color: Optional[str] = None
    hair_color_hex: Optional[str] = None
    recommended_palette: Optional[Dict[str, Any]] = None
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
