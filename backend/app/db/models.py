from sqlalchemy import Column, String, Enum, TIMESTAMP, text, Boolean, ForeignKey, Numeric, JSON, Text
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
    color_profile = relationship("ColorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


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


class ColorProfile(Base):
    __tablename__ = "color_profiles"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    measurement_id = Column(CHAR(36), ForeignKey("measurement_profiles.id", ondelete="CASCADE"), nullable=False)
    skin_tone = Column(String(50), nullable=True)
    skin_tone_hex = Column(String(7), nullable=True)
    hair_color = Column(String(50), nullable=True)
    hair_color_hex = Column(String(7), nullable=True)
    recommended_palette = Column(JSON, nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    )

    user = relationship("User", back_populates="color_profile")
    measurement_profile = relationship("MeasurementProfile")


class OutfitRecommendation(Base):
    __tablename__ = "outfit_recommendations"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    measurement_id = Column(CHAR(36), ForeignKey("measurement_profiles.id", ondelete="SET NULL"), nullable=True)
    occasion = Column(String(100), nullable=True)
    weather = Column(String(50), nullable=True)
    dress_code = Column(String(50), nullable=True)
    total_price = Column(Numeric(10, 2), nullable=True)
    reasoning = Column(Text, nullable=True)
    user_rating = Column(Enum("LIKE", "DISLIKE", "NONE"), default="NONE")
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User")
    measurement_profile = relationship("MeasurementProfile")
