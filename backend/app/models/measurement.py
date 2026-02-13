from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MeasurementCreate(BaseModel):
    """Create a measurement profile. All values in CM/kg."""
    name: str
    height: Optional[float] = None
    weight: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    inseam: Optional[float] = None
    shoulder_width: Optional[float] = None
    arm_length: Optional[float] = None


class MeasurementUpdate(BaseModel):
    """Update a measurement profile. All values in CM/kg."""
    name: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    inseam: Optional[float] = None
    shoulder_width: Optional[float] = None
    arm_length: Optional[float] = None
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
