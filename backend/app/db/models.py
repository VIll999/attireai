from sqlalchemy import Column, String, Enum, TIMESTAMP, text, Boolean, ForeignKey, Numeric, JSON, Text, Integer, Date
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
    vip_trial_used = Column(Boolean, default=False, nullable=False)
    daily_recommendation_count = Column(Integer, default=0, nullable=False)
    daily_recommendation_date = Column(Date, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    )

    measurements = relationship("MeasurementProfile", back_populates="user", cascade="all, delete-orphan")
    color_profile = relationship("ColorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    style_preferences = relationship("StylePreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    outfit_recommendations = relationship(
        "OutfitRecommendation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    outfit_ratings = relationship(
        "OutfitRating",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    saved_outfits = relationship(
        "SavedOutfit",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    virtual_try_ons = relationship(
        "VirtualTryOn",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    subscription = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    style_presets = relationship(
        "StylePreset",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )


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


class StylePreferences(Base):
    __tablename__ = "style_preferences"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    occasion = Column(String(50), nullable=True)
    weather = Column(String(50), nullable=True)
    dress_code = Column(String(50), nullable=True)
    preferred_styles = Column(JSON, nullable=True)
    avoided_styles = Column(JSON, nullable=True)
    price_range = Column(Enum("BUDGET", "MID_RANGE", "LUXURY"), default="MID_RANGE")
    preferred_brands = Column(JSON, nullable=True)
    excluded_brands = Column(JSON, nullable=True)
    updated_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))

    user = relationship("User", back_populates="style_preferences")


class StylePreset(Base):
    __tablename__ = "style_presets"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    occasion = Column(String(100), nullable=True)
    weather = Column(String(50), nullable=True)
    dress_code = Column(String(50), nullable=True)
    preferred_styles = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User", back_populates="style_presets")


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
    feature_vector = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User", back_populates="outfit_recommendations")
    measurement_profile = relationship("MeasurementProfile")
    items = relationship(
        "RecommendationItem",
        back_populates="recommendation",
        cascade="all, delete-orphan",
    )
    saved_by = relationship(
        "SavedOutfit",
        back_populates="recommendation",
        cascade="all, delete-orphan",
    )
    try_ons = relationship(
        "VirtualTryOn",
        back_populates="outfit",
        cascade="all, delete-orphan",
    )
    ratings = relationship(
        "OutfitRating",
        back_populates="recommendation",
        cascade="all, delete-orphan",
    )


class RecommendationItem(Base):
    __tablename__ = "recommendation_items"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    recommendation_id = Column(
        CHAR(36),
        ForeignKey("outfit_recommendations.id", ondelete="CASCADE"),
        nullable=False,
    )
    external_product_id = Column(String(100), nullable=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True)
    category = Column(Enum("TOP", "BOTTOM", "SHOES", "ACCESSORY", "OUTERWEAR"), nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="USD")
    image_url = Column(String(500), nullable=True)
    purchase_url = Column(String(500), nullable=True)
    recommended_size = Column(String(20), nullable=True)
    colors = Column(JSON, nullable=True)
    material = Column(String(100), nullable=True)
    outfit_index = Column(Integer, nullable=True)
    stock_status = Column(Enum("IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"), default="UNKNOWN", nullable=True)

    recommendation = relationship("OutfitRecommendation", back_populates="items")


class OutfitRating(Base):
    __tablename__ = "outfit_ratings"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recommendation_id = Column(CHAR(36), ForeignKey("outfit_recommendations.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Enum("LIKE", "DISLIKE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    )

    user = relationship("User", back_populates="outfit_ratings")
    recommendation = relationship("OutfitRecommendation", back_populates="ratings")


class SavedOutfit(Base):
    __tablename__ = "saved_outfits"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recommendation_id = Column(
        CHAR(36),
        ForeignKey("outfit_recommendations.id", ondelete="CASCADE"),
        nullable=False,
    )
    collection_name = Column(String(50), default="Favorites")
    is_purchased = Column(Boolean, default=False)
    try_on_image_url = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User", back_populates="saved_outfits")
    recommendation = relationship("OutfitRecommendation", back_populates="saved_by")


class VirtualTryOn(Base):
    __tablename__ = "virtual_try_ons"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_photo_url = Column(String(500), nullable=False)
    outfit_id = Column(CHAR(36), ForeignKey("outfit_recommendations.id", ondelete="CASCADE"), nullable=False)
    result_image_url = Column(String(500), nullable=True)
    status = Column(Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED"), default="PENDING")
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    completed_at = Column(TIMESTAMP, nullable=True)

    user = relationship("User", back_populates="virtual_try_ons")
    outfit = relationship("OutfitRecommendation", back_populates="try_ons")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(String(500), nullable=True)
    notification_metadata = Column("metadata", JSON, nullable=True)
    read_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User", back_populates="notifications")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(CHAR(36), primary_key=True, default=generate_uuid)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    stripe_customer_id = Column(String(100), nullable=True)
    stripe_subscription_id = Column(String(100), nullable=True)
    status = Column(Enum("ACTIVE", "CANCELLED", "PAST_DUE", "TRIALING"), default="TRIALING")
    current_period_start = Column(TIMESTAMP, nullable=True)
    current_period_end = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User", back_populates="subscription")
