from pydantic import BaseModel, Field

from typing import Optional
from datetime import datetime


class MeasurementCreate(BaseModel):
    """Create a measurement profile. All values in CM/kg."""
    name: str = Field(..., min_length=1, max_length=50)
    height: Optional[float] = Field(default=None, ge=40, le=300)
    weight: Optional[float] = Field(default=None, ge=2, le=350)
    chest: Optional[float] = Field(default=None, ge=30, le=180)
    waist: Optional[float] = Field(default=None, ge=20, le=170)
    hip: Optional[float] = Field(default=None, ge=30, le=180)
    inseam: Optional[float] = Field(default=None, ge=20, le=110)
    shoulder_width: Optional[float] = Field(default=None, ge=15, le=70)
    arm_length: Optional[float] = Field(default=None, ge=20, le=100)
    is_primary: Optional[bool] = None


class MeasurementUpdate(BaseModel):
    """Update a measurement profile. All values in CM/kg."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    height: Optional[float] = Field(default=None, ge=40, le=300)
    weight: Optional[float] = Field(default=None, ge=2, le=350)
    chest: Optional[float] = Field(default=None, ge=30, le=180)
    waist: Optional[float] = Field(default=None, ge=20, le=170)
    hip: Optional[float] = Field(default=None, ge=30, le=180)
    inseam: Optional[float] = Field(default=None, ge=20, le=110)
    shoulder_width: Optional[float] = Field(default=None, ge=15, le=70)
    arm_length: Optional[float] = Field(default=None, ge=20, le=100)
    is_primary: Optional[bool] = None


class MeasurementResponse(BaseModel):
    id: str
    user_id: str
    name: str
    height: Optional[float] = None
    weight: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    inseam: Optional[float] = None
    shoulder_width: Optional[float] = None
    arm_length: Optional[float] = None
    is_primary: bool = False
    source: str = "MANUAL"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
