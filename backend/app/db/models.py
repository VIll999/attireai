from sqlalchemy import Column, String, Enum, TIMESTAMP, text, Boolean, ForeignKey, Numeric
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
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

    measurements = relationship("MeasurementProfile", back_populates="user", cascade="all, delete-orphan")


class MeasurementProfile(Base):
    __tablename__ = "measurement_profiles"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    height = Column(Numeric(5, 2), nullable=True)
    weight = Column(Numeric(5, 2), nullable=True)
    chest = Column(Numeric(5, 2), nullable=True)
    waist = Column(Numeric(5, 2), nullable=True)
    hip = Column(Numeric(5, 2), nullable=True)
    inseam = Column(Numeric(5, 2), nullable=True)
    shoulder_width = Column(Numeric(5, 2), nullable=True)
    arm_length = Column(Numeric(5, 2), nullable=True)
    is_primary = Column(Boolean, default=False)
    source = Column(Enum("MANUAL", "CAMERA"), default="MANUAL")
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    )

    user = relationship("User", back_populates="measurements")
