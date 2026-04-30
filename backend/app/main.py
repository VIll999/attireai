from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, users, upload, measurements, sizing, color_profiles, outfit_recommendations, style_preferences, recommendations, vision, saved_outfits, ratings, subscriptions, stripe_webhook, virtual_try_on, notifications, admin

import os
import json

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI-powered fashion recommendation API",
    version="0.1.0",
)

# CORS origins from env var or defaults
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://attireai-cyan.vercel.app")

# Handle both JSON array and comma-separated formats
try:
    origins = json.loads(cors_origins_str)
except json.JSONDecodeError:
    origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(measurements.router, prefix="/measurements", tags=["Measurements"])
app.include_router(sizing.router, prefix="/sizing", tags=["Sizing"])
app.include_router(color_profiles.router, prefix="/color-profiles", tags=["Color Profiles"])
app.include_router(outfit_recommendations.router, prefix="/outfit-recommendations", tags=["Outfit Recommendations"])
app.include_router(style_preferences.router, prefix="/style-preferences", tags=["Style Preferences"])
app.include_router(recommendations.router, tags=["Recommendations"])
app.include_router(vision.router, prefix="/vision", tags=["Vision"])
app.include_router(saved_outfits.router, tags=["Saved Outfits"])
app.include_router(ratings.router, tags=["Ratings"])
app.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])
app.include_router(stripe_webhook.router, prefix="/stripe", tags=["Stripe Webhook"])
app.include_router(virtual_try_on.router, prefix="/virtual-try-on", tags=["Virtual Try-On"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

@app.get("/")
async def root():
    return {"message": "Welcome to AttireAI API", "docs": "/docs"}
