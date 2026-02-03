from sqlalchemy import Column, String, Enum, TIMESTAMP, text
from sqlalchemy.dialects.mysql import CHAR
from app.db.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False)
    firebase_uid = Column(String(128), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    profile_picture_url = Column(String(500), nullable=True)
    subscription_tier = Column(Enum("FREE", "VIP"), default="FREE")
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    )
