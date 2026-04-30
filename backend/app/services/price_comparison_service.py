"""Sprint 3 Story #8: Price comparison via Gemini + Google Search.

Given an item (name + brand), search the web for similar/same listings across
retailers and return a structured list of {retailer, price, currency, url,
stock_status, image_url, notes}. Best-effort: missing fields are tolerated.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


PROMPT = (
    "You are a price comparison assistant.\n"
    "Use Google Search to find current listings for the SAME or near-identical product\n"
    "the user describes, across multiple retailers.\n"
    "Return ONLY valid JSON with this structure:\n"
    "{\"results\": [{\"retailer\": \"<store name>\", \"price\": <number or null>,\n"
    "  \"currency\": \"<3-letter code>\", \"url\": \"<product page url>\",\n"
    "  \"stock_status\": \"IN_STOCK|LOW_STOCK|OUT_OF_STOCK|UNKNOWN\",\n"
    "  \"image_url\": \"<optional>\", \"notes\": \"<short note like 'on sale', or null>\"}]}\n"
    "Rules:\n"
    "- Return up to 5 distinct retailers; do not repeat the same retailer.\n"
    "- Use real, currently-listed product pages — not category pages.\n"
    "- Do not invent prices. Omit price (null) if you cannot confirm it.\n"
    "- If nothing relevant is found, return {\"results\": []}.\n"
    "- Order by price ascending when prices are known; UNKNOWN last.\n"
)


def _parse_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        # strip ```json or ``` fences
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


class PriceComparisonService:
    @staticmethod
    def compare(
        name: str,
        brand: Optional[str] = None,
        currency: str = "USD",
    ) -> List[Dict[str, Any]]:
        if not settings.google_api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set")
        from google import genai
        from google.genai.types import Tool, GoogleSearch, GenerateContentConfig

        client = genai.Client(api_key=settings.google_api_key)

        descriptor = name.strip()
        if brand:
            descriptor = f"{brand.strip()} {descriptor}"
        user_msg = json.dumps(
            {
                "product": descriptor,
                "preferred_currency": currency,
            },
            ensure_ascii=False,
        )

        try:
            response = client.models.generate_content(
                model=settings.gemini_model or "gemini-2.5-flash",
                contents=f"{PROMPT}\n\nProduct:\n{user_msg}",
                config=GenerateContentConfig(
                    tools=[Tool(google_search=GoogleSearch())],
                ),
            )
        except Exception as exc:
            logger.warning("Price comparison Gemini call failed: %s", exc)
            return []

        text = (response.text or "").strip()
        if not text:
            return []
        try:
            data = _parse_json(text)
        except Exception as exc:
            logger.warning("Price comparison JSON parse failed: %s | text=%s", exc, text[:300])
            return []

        results = data.get("results") if isinstance(data, dict) else None
        if not isinstance(results, list):
            return []

        cleaned: List[Dict[str, Any]] = []
        seen_retailers: set[str] = set()
        for r in results:
            if not isinstance(r, dict):
                continue
            retailer = (r.get("retailer") or "").strip()
            url = (r.get("url") or "").strip()
            if not retailer or not url:
                continue
            key = retailer.lower()
            if key in seen_retailers:
                continue
            seen_retailers.add(key)
            price = r.get("price")
            try:
                price_val = float(price) if price is not None else None
            except (TypeError, ValueError):
                price_val = None
            cleaned.append(
                {
                    "retailer": retailer,
                    "price": price_val,
                    "currency": (r.get("currency") or currency or "USD")[:3].upper(),
                    "url": url,
                    "stock_status": r.get("stock_status") or "UNKNOWN",
                    "image_url": r.get("image_url"),
                    "notes": r.get("notes"),
                }
            )
            if len(cleaned) >= 5:
                break
        return cleaned
