import logging
from typing import List, Optional, Tuple

import httpx
from google import genai
from google.genai.types import Part, Content

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


_FETCH_TIMEOUT = 15.0
_MAX_ITEM_IMAGES = 4


TRY_ON_PROMPT_TEMPLATE = """You are a virtual fashion try-on assistant. The first image shows a person.
The remaining images show clothing or accessory items to be worn.

Generate a single photorealistic image of the same person wearing the items together as a complete outfit.
Requirements:
- Preserve the person's face, hair, skin tone, body proportions and identity exactly.
- Keep the same pose and a clean studio-style background unless the original photo had a clear setting.
- Render the garments naturally with realistic fit, drape, lighting and shadows.
- Do not include any text, watermarks, logos, or borders in the output.

Outfit description: {description}
"""


class TryOnService:
    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            if not settings.google_api_key:
                raise RuntimeError("GOOGLE_API_KEY not configured")
            cls._client = genai.Client(api_key=settings.google_api_key)
        return cls._client

    @staticmethod
    def _fetch_image(url: str) -> Optional[Tuple[bytes, str]]:
        try:
            response = httpx.get(url, timeout=_FETCH_TIMEOUT, follow_redirects=True)
            response.raise_for_status()
            mime = response.headers.get("content-type", "image/jpeg").split(";")[0].strip()
            if not mime.startswith("image/"):
                mime = "image/jpeg"
            return response.content, mime
        except Exception as exc:
            logger.warning("Failed to fetch image %s: %s", url, exc)
            return None

    @classmethod
    def generate(
        cls,
        user_photo_url: str,
        item_image_urls: List[str],
        outfit_description: str,
    ) -> bytes:
        """Generate a try-on image. Returns PNG/JPEG bytes."""
        client = cls._get_client()

        user_image = cls._fetch_image(user_photo_url)
        if not user_image:
            raise RuntimeError("Failed to download user photo")

        parts: List[Part] = [Part.from_bytes(data=user_image[0], mime_type=user_image[1])]
        for url in item_image_urls[:_MAX_ITEM_IMAGES]:
            fetched = cls._fetch_image(url)
            if fetched:
                parts.append(Part.from_bytes(data=fetched[0], mime_type=fetched[1]))

        parts.append(Part.from_text(text=TRY_ON_PROMPT_TEMPLATE.format(description=outfit_description)))

        try:
            response = client.models.generate_content(
                model=settings.gemini_image_model,
                contents=[Content(parts=parts, role="user")],
            )
        except Exception as exc:
            logger.error("Gemini image gen call failed: %s", exc)
            raise RuntimeError(f"Try-on generation failed: {exc}")

        # Extract first inline image from response
        if not response.candidates:
            raise RuntimeError("Gemini returned no candidates")
        for part in response.candidates[0].content.parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                return inline.data

        raise RuntimeError("Gemini did not return an image")
