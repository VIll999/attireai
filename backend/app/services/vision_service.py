import base64
import json
import logging
from typing import Dict, Any

from google import genai
from google.genai.types import Part, Content, GenerateContentConfig

from app.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)

VISION_PROMPT = """Analyze this photo of a person and detect their skin tone and hair color.

Return a JSON object with these exact fields:
{
  "skin_tone": one of ["Fair", "Light", "Medium", "Tan", "Olive", "Deep"],
  "skin_tone_hex": the hex color code that best represents their actual skin tone (e.g., "#E8B999"),
  "hair_color": one of ["Blonde", "Red", "Brown", "Black", "Gray", "Other"],
  "hair_color_hex": the hex color code that best represents their actual hair color (e.g., "#4B3621"),
  "confidence": a float from 0.0 to 1.0 indicating your confidence in the detection
}

Important:
- The hex values should represent the ACTUAL detected colors, not generic category colors.
- If the person is not clearly visible, return your best guess with low confidence.
- Return ONLY the JSON object, no other text.
"""


class VisionService:
    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            if not settings.google_api_key:
                raise RuntimeError("GOOGLE_API_KEY not configured")
            cls._client = genai.Client(api_key=settings.google_api_key)
        return cls._client

    @classmethod
    def analyze_colors(cls, photo_base64: str) -> Dict[str, Any]:
        """Analyze a photo using Gemini Vision to detect skin tone and hair color."""
        client = cls._get_client()

        # Decode and validate the image
        try:
            image_bytes = base64.b64decode(photo_base64)
        except Exception:
            raise ValueError("Invalid base64 image data")

        if len(image_bytes) > 5 * 1024 * 1024:
            raise ValueError("Image too large (max 5MB)")

        image_part = Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
        text_part = Part.from_text(VISION_PROMPT)

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[Content(parts=[image_part, text_part])],
                config=GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

            result = json.loads(response.text)

            # Validate and normalize the response
            valid_skin_tones = {"Fair", "Light", "Medium", "Tan", "Olive", "Deep"}
            valid_hair_colors = {"Blonde", "Red", "Brown", "Black", "Gray", "Other"}

            skin_tone = result.get("skin_tone", "Medium")
            if skin_tone not in valid_skin_tones:
                skin_tone = "Medium"

            hair_color = result.get("hair_color", "Brown")
            if hair_color not in valid_hair_colors:
                hair_color = "Brown"

            return {
                "skin_tone": skin_tone,
                "skin_tone_hex": result.get("skin_tone_hex", "#E8B999"),
                "hair_color": hair_color,
                "hair_color_hex": result.get("hair_color_hex", "#4B3621"),
                "confidence": min(max(float(result.get("confidence", 0.5)), 0.0), 1.0),
            }

        except json.JSONDecodeError:
            logger.error("Gemini Vision returned non-JSON response")
            raise RuntimeError("Failed to parse AI response")
        except Exception as e:
            logger.error(f"Gemini Vision API error: {e}")
            raise RuntimeError(f"Vision analysis failed: {str(e)}")
