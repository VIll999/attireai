from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TryOnGenerateRequest(BaseModel):
    outfit_id: str
    user_photo_url: str


class TryOnResponse(BaseModel):
    id: str
    outfit_id: str
    user_photo_url: str
    result_image_url: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
