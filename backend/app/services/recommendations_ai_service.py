import json
import os
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import get_settings

# Load mock product data once at module level
_MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "mock_products.json")
with open(_MOCK_DATA_PATH, "r") as _f:
    MOCK_PRODUCTS: Dict[str, List[Dict[str, Any]]] = json.load(_f)
from app.db.models import (
    User,
    MeasurementProfile,
    ColorProfile,
    StylePreferences,
    OutfitRecommendation,
    RecommendationItem,
)
from app.services.learning_service import RecommendationLearningService
from app.models.recommendations_ai import (
    AIWebCandidatesRequest,
    AIWebCandidatesResponse,
    AlternativeItemsRequest,
    AlternativeItemsResponse,
)

settings = get_settings()

ALLOWED_CATEGORIES = {"TOP", "BOTTOM", "SHOES", "ACCESSORY", "OUTERWEAR", "OTHER"}


def normalize_category(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    s = raw.strip().upper()
    if s in ALLOWED_CATEGORIES:
        return None if s == "OTHER" else s

    mapping = {
        "JACKET": "OUTERWEAR", "COAT": "OUTERWEAR", "PUFFER": "OUTERWEAR",
        "BLAZER": "OUTERWEAR", "HOODIE": "OUTERWEAR", "SWEATSHIRT": "OUTERWEAR",
        "CARDIGAN": "OUTERWEAR",
        "TOPS": "TOP", "TSHIRT": "TOP", "T-SHIRT": "TOP", "SHIRT": "TOP",
        "DRESS SHIRT": "TOP", "POLO": "TOP", "SWEATER": "TOP",
        "PANTS": "BOTTOM", "TROUSERS": "BOTTOM", "JEANS": "BOTTOM",
        "SHORTS": "BOTTOM", "SKIRT": "BOTTOM",
        "FOOTWEAR": "SHOES", "SNEAKERS": "SHOES", "BOOTS": "SHOES",
        "LOAFERS": "SHOES", "RUNNING SHOES": "SHOES",
        "BAG": "ACCESSORY", "BACKPACK": "ACCESSORY", "HAT": "ACCESSORY",
        "CAP": "ACCESSORY", "BELT": "ACCESSORY", "WATCH": "ACCESSORY",
        "SCARF": "ACCESSORY", "GLOVES": "ACCESSORY", "SUNGLASSES": "ACCESSORY",
        "JEWELRY": "ACCESSORY",
    }
    if s in mapping:
        return mapping[s]

    # fuzzy fallback
    for keywords, cat in [
        (["JACKET", "COAT", "OUTER", "PUFFER", "BLAZER", "HOODIE"], "OUTERWEAR"),
        (["PANT", "JEAN", "TROUSER", "SHORT", "SKIRT"], "BOTTOM"),
        (["SHOE", "SNEAKER", "BOOT", "LOAFER"], "SHOES"),
        (["HAT", "CAP", "BAG", "BELT", "WATCH", "SCARF", "GLOVE", "SUNGLASS", "JEWEL"], "ACCESSORY"),
        (["SHIRT", "TEE", "TOP", "POLO", "SWEATER"], "TOP"),
    ]:
        if any(k in s for k in keywords):
            return cat
    return None


PRODUCT_SCHEMA = {
    "type": "object",
    "properties": {
        "outfits": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "reasoning": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "brand": {"type": "string"},
                                "category": {"type": "string"},
                                "source_urls": {"type": "array", "items": {"type": "string"}},
                                "price": {"type": "number"},
                                "currency": {"type": "string"},
                                "image_url": {"type": "string"},
                                "purchase_url": {"type": "string"},
                                "recommended_color": {"type": "string"},
                            },
                            "required": ["name", "category"],
                        },
                    },
                },
                "required": ["reasoning", "items"],
            },
        }
    },
    "required": ["outfits"],
}

SYSTEM_PROMPT = (
    "You are a product discovery assistant.\n"
    "Use search to find REAL products that match the user's context and preferences.\n"
    "Return ONLY valid JSON with this structure:\n"
    "{outfits: [{reasoning: '...', items: [{name, brand, category, source_urls, price, "
    "currency, image_url, purchase_url, recommended_color}]}]}\n"
    "IMPORTANT:\n"
    "- Return exactly 5 DISTINCT complete outfits\n"
    "- Each outfit MUST have at least 4 items: one TOP, one BOTTOM, one SHOES, and one ACCESSORY\n"
    "- Outfits may include additional items like OUTERWEAR if appropriate for the weather/occasion\n"
    "- Each outfit should have a 'reasoning' explaining why the combination works together\n"
    "- Find real products with real prices from real stores\n"
    "- category MUST be one of: TOP, BOTTOM, SHOES, ACCESSORY, OUTERWEAR, OTHER\n"
    "- If price is unknown, omit it\n"
    "- Include source_urls from search results\n"
    "- image_url and purchase_url should be real links when available\n"
    "- Each outfit should be stylistically different from the others\n"
    "- If location is provided but weather is not, infer current weather for that location\n"
    "- If a 'pinned_item' is provided in the user context, EVERY outfit must include\n"
    "  that exact item (use its name, brand, category, image_url, purchase_url verbatim)\n"
    "  as one of its items, and the other items must be chosen to complement it.\n"
)


class RecommendationsAIService:
    def __init__(self) -> None:
        self._gemini_client = None
        self._openai_client = None

    def _get_gemini_client(self):
        if self._gemini_client is None:
            if not settings.google_api_key:
                raise RuntimeError("GOOGLE_API_KEY is not set")
            from google import genai
            self._gemini_client = genai.Client(api_key=settings.google_api_key)
        return self._gemini_client

    def _get_openai_client(self):
        if self._openai_client is None:
            if not settings.openai_api_key:
                raise RuntimeError("OPENAI_API_KEY is not set")
            from openai import OpenAI
            self._openai_client = OpenAI(api_key=settings.openai_api_key)
        return self._openai_client

    # ---- DB helpers ----

    def _get_user_by_uid(self, db: Session, firebase_uid: str) -> User:
        if not firebase_uid:
            raise ValueError("Missing Firebase UID header")
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        if not user:
            raise ValueError("User not found")
        return user

    def _get_measurement_profile(
        self, db: Session, user_id: str, measurement_profile_id: Optional[str],
    ) -> Optional[MeasurementProfile]:
        if measurement_profile_id:
            return (
                db.query(MeasurementProfile)
                .filter(MeasurementProfile.id == measurement_profile_id, MeasurementProfile.user_id == user_id)
                .first()
            )
        return (
            db.query(MeasurementProfile)
            .filter(MeasurementProfile.user_id == user_id)
            .order_by(MeasurementProfile.is_primary.desc(), MeasurementProfile.created_at.desc())
            .first()
        )

    def _get_color_profile(self, db: Session, user_id: str) -> Optional[ColorProfile]:
        return db.query(ColorProfile).filter(ColorProfile.user_id == user_id).first()

    def _get_style_preference(self, db: Session, user_id: str) -> Optional[StylePreferences]:
        return db.query(StylePreferences).filter(StylePreferences.user_id == user_id).first()

    # ---- Context builder ----

    def _build_context_payload(
        self,
        user: User,
        measurement: Optional[MeasurementProfile],
        color: Optional[ColorProfile],
        style: Optional[StylePreferences],
        req: AIWebCandidatesRequest,
    ) -> Dict[str, Any]:
        overrides = req.context_overrides.model_dump()
        extra = overrides.get("extra") or {}

        payload: Dict[str, Any] = {
            "context": {
                "occasion": overrides.get("occasion"),
                "weather": overrides.get("weather"),
                "location": overrides.get("location"),
                "dress_code": overrides.get("dress_code"),
                "budget": extra.get("budget"),
                "currency": extra.get("currency") or req.currency,
                "styles": extra.get("styles"),
                "gender": extra.get("gender"),
            },
            "categories": req.categories,
            "num_outfits": 5,
        }

        if measurement:
            payload["measurements"] = {
                "height": float(measurement.height) if measurement.height is not None else None,
                "weight": float(measurement.weight) if measurement.weight is not None else None,
                "chest": float(measurement.chest) if measurement.chest is not None else None,
                "waist": float(measurement.waist) if measurement.waist is not None else None,
                "hip": float(measurement.hip) if measurement.hip is not None else None,
                "inseam": float(measurement.inseam) if measurement.inseam is not None else None,
            }

        if color:
            payload["color_profile"] = {
                "skin_tone": color.skin_tone,
                "hair_color": color.hair_color,
                "recommended_palette": color.recommended_palette,
            }

        if style:
            payload["style_preferences"] = {
                "preferred_styles": style.preferred_styles,
                "avoided_styles": style.avoided_styles,
                "price_range": style.price_range,
                "preferred_brands": style.preferred_brands,
            }

        # Sprint 3 Story #6: pinned wardrobe item — every outfit must include it.
        pinned_item_id = getattr(req, "pinned_item_id", None)
        if pinned_item_id:
            from app.db.models import RecommendationItem
            from app.db.database import SessionLocal

            with SessionLocal() as _db:
                pinned = (
                    _db.query(RecommendationItem)
                    .filter(RecommendationItem.id == pinned_item_id)
                    .first()
                )
                if pinned:
                    payload["pinned_item"] = {
                        "name": pinned.name,
                        "brand": pinned.brand,
                        "category": pinned.category,
                        "image_url": pinned.image_url,
                        "purchase_url": pinned.purchase_url,
                        "price": float(pinned.price) if pinned.price is not None else None,
                        "currency": pinned.currency,
                    }

        return payload

    # ---- AI calls ----

    def _call_gemini(self, context_payload: Dict[str, Any]) -> Dict[str, Any]:
        from google.genai.types import Tool, GoogleSearch, GenerateContentConfig

        client = self._get_gemini_client()
        user_msg = json.dumps(context_payload, ensure_ascii=False)

        response = client.models.generate_content(
            model=settings.gemini_model or "gemini-2.5-flash",
            contents=f"{SYSTEM_PROMPT}\n\nUser context:\n{user_msg}",
            config=GenerateContentConfig(
                tools=[Tool(google_search=GoogleSearch())],
            ),
        )

        # Extract JSON from response text (may be wrapped in ```json ... ```)
        text = response.text.strip()
        if text.startswith("```"):
            # Strip markdown code fences
            lines = text.split("\n")
            lines = lines[1:] if lines[0].startswith("```") else lines
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)
        return json.loads(text)

    def _call_openai(self, context_payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._get_openai_client()
        user_msg = json.dumps(context_payload, ensure_ascii=False)

        schema = {
            "name": "web_candidate_products",
            "schema": PRODUCT_SCHEMA,
            "strict": False,
        }

        resp = client.responses.create(
            model=settings.openai_model or "gpt-4.1-mini",
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            tools=[{"type": "web_search"}],
            text={
                "format": {
                    "type": "json_schema",
                    "name": schema["name"],
                    "schema": schema["schema"],
                    "strict": schema["strict"],
                }
            },
        )

        raw = getattr(resp, "output_text", None)
        if not raw:
            raw = ""
            for item in getattr(resp, "output", []) or []:
                for c in getattr(item, "content", []) or []:
                    if getattr(c, "type", None) in ("output_text", "text"):
                        raw += getattr(c, "text", "")

        return json.loads(raw)

    def _call_ai(self, context_payload: Dict[str, Any]) -> Dict[str, Any]:
        provider = settings.ai_provider

        if provider == "openai":
            return self._call_openai(context_payload)
        elif provider == "gemini":
            return self._call_gemini(context_payload)
        else:
            raise RuntimeError(f"Unknown AI provider: {provider}. Set AI_PROVIDER to 'gemini' or 'openai'.")

    # ---- Size recommendation (simple mapping) ----

    def _recommended_size(self, category: Optional[str], measurement: Optional[MeasurementProfile]) -> Optional[str]:
        if not category or not measurement:
            return None
        cat = category.upper()
        chest = float(measurement.chest) if measurement.chest is not None else None
        waist = float(measurement.waist) if measurement.waist is not None else None

        if cat in ("TOP", "OUTERWEAR"):
            if chest is None:
                return None
            if chest < 34: return "XS"
            if chest < 38: return "S"
            if chest < 42: return "M"
            if chest < 46: return "L"
            return "XL"

        if cat == "BOTTOM":
            if waist is None:
                return None
            return f"W{int(round(waist))}"

        return None

    # ---- Post process ----

    def _post_process_items(
        self, result: Dict[str, Any], measurement: Optional[MeasurementProfile], req: AIWebCandidatesRequest,
    ) -> Dict[str, Any]:
        currency_default = (req.context_overrides.extra or {}).get("currency") or req.currency or "USD"

        def _process_item(it: Dict[str, Any]) -> Dict[str, Any]:
            cat_norm = normalize_category(it.get("category"))
            it["category"] = cat_norm
            if not it.get("currency"):
                it["currency"] = currency_default
            if not it.get("purchase_url"):
                urls = it.get("source_urls") or []
                it["purchase_url"] = urls[0] if urls else None
            it["recommended_size"] = self._recommended_size(cat_norm, measurement)
            return it

        # Handle outfit format ({outfits: [...]})
        raw_outfits = result.get("outfits") or []
        if raw_outfits:
            outfits = []
            for outfit in raw_outfits:
                outfits.append({
                    "reasoning": outfit.get("reasoning", ""),
                    "items": [_process_item(it) for it in outfit.get("items", [])],
                })
            return {"outfits": outfits}

        # Fallback: flat items list — wrap as single outfit
        items: List[Dict[str, Any]] = result.get("items", []) or []
        return {"outfits": [{"reasoning": "", "items": [_process_item(it) for it in items]}]}

    # ---- Persist ----

    def _persist(self, db: Session, user_id: str, req: AIWebCandidatesRequest, result: Dict[str, Any]) -> List[str]:
        rec_ids: List[str] = []

        for outfit in result.get("outfits", []):
            # First pass: calculate total price for this outfit
            total_price = Decimal("0.00")
            items_data = []

            for it in outfit.get("items", []):
                name = (it.get("name") or "").strip() or "Unknown Item"
                price_val = it.get("price")
                price_dec: Optional[Decimal] = None
                try:
                    if price_val is not None:
                        price_dec = Decimal(str(price_val)).quantize(Decimal("0.01"))
                        total_price += price_dec
                except Exception:
                    price_dec = None

                items_data.append({
                    "name": name,
                    "brand": it.get("brand") or None,
                    "category": normalize_category(it.get("category")),
                    "price": price_dec,
                    "currency": (it.get("currency") or req.currency or "USD")[:3],
                    "image_url": it.get("image_url") or None,
                    "purchase_url": it.get("purchase_url") or None,
                    "recommended_size": it.get("recommended_size") or None,
                })

            # Create recommendation with calculated total_price
            rec = OutfitRecommendation(
                user_id=user_id,
                measurement_id=req.measurement_profile_id,
                occasion=req.context_overrides.occasion,
                weather=req.context_overrides.weather,
                dress_code=req.context_overrides.dress_code,
                reasoning=outfit.get("reasoning") or f"AI recommendations via {settings.ai_provider}",
                total_price=total_price if total_price > 0 else None,
            )
            db.add(rec)
            db.flush()

            # Second pass: create all items
            for item_data in items_data:
                db.add(RecommendationItem(
                    recommendation_id=rec.id,
                    **item_data
                ))

            rec_ids.append(rec.id)

        db.commit()
        return rec_ids

    # ---- Mock fallback ----

    def _get_mock_items(self, req: AIWebCandidatesRequest, measurement: Optional[MeasurementProfile]) -> Dict[str, Any]:
        occasion = (req.context_overrides.occasion or req.occasion or "casual").lower()

        # New format: mock data has outfits array per occasion
        occasion_data = MOCK_PRODUCTS.get(occasion) or MOCK_PRODUCTS.get("casual", {})

        raw_outfits = []
        if isinstance(occasion_data, dict) and "outfits" in occasion_data:
            raw_outfits = occasion_data["outfits"]
        elif isinstance(occasion_data, list):
            raw_outfits = [{"reasoning": "Classic combination for the occasion", "items": occasion_data}]

        result_outfits = []
        for outfit in raw_outfits[:5]:
            items = []
            for it in outfit.get("items", []):
                item = dict(it)
                item["recommended_size"] = self._recommended_size(item.get("category"), measurement)
                items.append(item)
            result_outfits.append({"reasoning": outfit.get("reasoning", ""), "items": items})

        return {"outfits": result_outfits}

    def _ai_available(self) -> bool:
        provider = settings.ai_provider
        if provider == "gemini":
            return bool(settings.google_api_key)
        elif provider == "openai":
            return bool(settings.openai_api_key)
        return False

    # ---- Public entry point ----

    def generate_web_candidates(
        self, db: Session, firebase_uid: str, req: AIWebCandidatesRequest,
    ) -> AIWebCandidatesResponse:
        user = self._get_user_by_uid(db, firebase_uid)
        measurement = self._get_measurement_profile(db, user.id, req.measurement_profile_id)
        color = self._get_color_profile(db, user.id)
        style = self._get_style_preference(db, user.id)

        use_mock = not self._ai_available()

        if use_mock:
            result = self._get_mock_items(req, measurement)
        else:
            context_payload = self._build_context_payload(user, measurement, color, style, req)
            result = self._call_ai(context_payload)
            result = self._post_process_items(result, measurement, req)

        recommendation_ids: List[str] = []
        if req.save_to_db:
            recommendation_ids = self._persist(db, user.id, req, result)

            # Apply learning-based re-ranking if recommendations were saved
            if recommendation_ids:
                # Reload recommendations from DB with all items
                recommendations = (
                    db.query(OutfitRecommendation)
                    .filter(OutfitRecommendation.id.in_(recommendation_ids))
                    .all()
                )

                # Apply learning service to re-rank
                learning_service = RecommendationLearningService()
                ranked_recommendations = learning_service.rank_recommendations(
                    db, user.id, recommendations, return_debug_info=False
                )

                # Rebuild result from ranked recommendations
                result = {"outfits": []}
                for rec in ranked_recommendations:
                    outfit = {
                        "reasoning": rec.reasoning,
                        "items": []
                    }
                    for item in rec.items:
                        outfit["items"].append({
                            "name": item.name,
                            "brand": item.brand,
                            "category": item.category,
                            "price": float(item.price) if item.price else None,
                            "currency": item.currency,
                            "image_url": item.image_url,
                            "purchase_url": item.purchase_url,
                            "recommended_size": item.recommended_size,
                        })
                    result["outfits"].append(outfit)

                # Update recommendation_ids to match new order
                recommendation_ids = [rec.id for rec in ranked_recommendations]

        # Flatten outfits into items for the response
        all_items: List[Dict[str, Any]] = []
        for idx, outfit in enumerate(result.get("outfits", [])):
            for it in outfit.get("items", []):
                it["outfit_index"] = idx
                it["reasoning"] = outfit.get("reasoning", "")
                all_items.append(it)

        return AIWebCandidatesResponse.model_validate({
            "recommendation_ids": recommendation_ids,
            "items": all_items,
            "debug": {"provider": "mock" if use_mock else settings.ai_provider},
        })

    # ---- Alternative items generation ----

    def generate_alternative_items(
        self, db: Session, firebase_uid: str, req: AlternativeItemsRequest,
    ) -> AlternativeItemsResponse:
        """
        Generate alternative items for a specific category within an outfit context.

        This focuses on finding alternatives for ONE specific item category
        while respecting the same outfit constraints (color palette, style, budget, etc.)
        """
        user = self._get_user_by_uid(db, firebase_uid)
        measurement = self._get_measurement_profile(db, user.id, req.measurement_profile_id)
        color = self._get_color_profile(db, user.id)
        style = self._get_style_preference(db, user.id)

        use_mock = not self._ai_available()

        if use_mock:
            # For mock mode, get items from the same category from mock data
            result = self._get_mock_alternatives(req, measurement)
        else:
            # Build AI context focused on this specific category
            context_payload = self._build_alternative_context(user, measurement, color, style, req)
            result = self._call_ai_for_alternatives(context_payload, req)
            result = self._post_process_alternative_items(result, measurement, req)

        return AlternativeItemsResponse.model_validate({
            "items": result.get("items", []),
            "debug": {"provider": "mock" if use_mock else settings.ai_provider},
        })

    def _build_alternative_context(
        self,
        user: User,
        measurement: Optional[MeasurementProfile],
        color: Optional[ColorProfile],
        style: Optional[StylePreferences],
        req: AlternativeItemsRequest,
    ) -> Dict[str, Any]:
        """Build AI prompt context for finding alternative items."""
        payload: Dict[str, Any] = {
            "context": {
                "occasion": req.occasion,
                "weather": req.weather,
                "location": req.location,
                "dress_code": req.dress_code,
                "budget": req.budget,
                "currency": req.currency,
                "styles": req.styles,
            },
            "category": req.category,
            "num_items": req.num_alternatives,
            "original_item": {
                "name": req.original_item_name,
                "brand": req.original_item_brand,
            },
        }

        if measurement:
            payload["measurements"] = {
                "height": float(measurement.height) if measurement.height is not None else None,
                "weight": float(measurement.weight) if measurement.weight is not None else None,
                "chest": float(measurement.chest) if measurement.chest is not None else None,
                "waist": float(measurement.waist) if measurement.waist is not None else None,
                "hip": float(measurement.hip) if measurement.hip is not None else None,
                "inseam": float(measurement.inseam) if measurement.inseam is not None else None,
            }

        if color:
            payload["color_profile"] = {
                "skin_tone": color.skin_tone,
                "hair_color": color.hair_color,
                "recommended_palette": color.recommended_palette,
            }

        if style:
            payload["style_preferences"] = {
                "preferred_styles": style.preferred_styles,
                "avoided_styles": style.avoided_styles,
                "price_range": style.price_range,
                "preferred_brands": style.preferred_brands,
            }

        return payload

    def _call_ai_for_alternatives(self, context_payload: Dict[str, Any], req: AlternativeItemsRequest) -> Dict[str, Any]:
        """Call AI to generate alternative items for a specific category."""
        from google.genai.types import Tool, GoogleSearch, GenerateContentConfig

        # Custom prompt for finding alternatives
        alt_system_prompt = (
            f"You are a fashion product discovery assistant.\n"
            f"Find {req.num_alternatives} REAL alternative {req.category} items that match the user's context and preferences.\n"
            f"The user is looking for alternatives to: {req.original_item_name or 'their current item'}\n"
            f"Return ONLY valid JSON with this structure:\n"
            f"{{items: [{{name, brand, category, source_urls, price, currency, image_url, purchase_url, recommended_color}}]}}\n"
            f"IMPORTANT:\n"
            f"- All items MUST be in the {req.category} category\n"
            f"- Find real products with real prices from real stores\n"
            f"- category should be: {req.category}\n"
            f"- If price is unknown, omit it\n"
            f"- Include source_urls from search results\n"
            f"- image_url and purchase_url should be real links when available\n"
            f"- Each alternative should be stylistically different from the others\n"
            f"- Respect the budget constraint if provided\n"
        )

        user_msg = json.dumps(context_payload, ensure_ascii=False)

        provider = settings.ai_provider

        if provider == "gemini":
            client = self._get_gemini_client()
            response = client.models.generate_content(
                model=settings.gemini_model or "gemini-2.5-flash",
                contents=f"{alt_system_prompt}\n\nUser context:\n{user_msg}",
                config=GenerateContentConfig(
                    tools=[Tool(google_search=GoogleSearch())],
                ),
            )

            # Extract JSON from response text
            text = response.text.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                lines = lines[1:] if lines[0].startswith("```") else lines
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines)
            return json.loads(text)

        elif provider == "openai":
            client = self._get_openai_client()

            schema = {
                "name": "alternative_items",
                "schema": {
                    "type": "object",
                    "properties": {
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "brand": {"type": "string"},
                                    "category": {"type": "string"},
                                    "source_urls": {"type": "array", "items": {"type": "string"}},
                                    "price": {"type": "number"},
                                    "currency": {"type": "string"},
                                    "image_url": {"type": "string"},
                                    "purchase_url": {"type": "string"},
                                    "recommended_color": {"type": "string"},
                                },
                                "required": ["name", "category"],
                            },
                        }
                    },
                    "required": ["items"],
                },
                "strict": False,
            }

            resp = client.responses.create(
                model=settings.openai_model or "gpt-4.1-mini",
                input=[
                    {"role": "system", "content": alt_system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                tools=[{"type": "web_search"}],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": schema["name"],
                        "schema": schema["schema"],
                        "strict": schema["strict"],
                    }
                },
            )

            raw = getattr(resp, "output_text", None)
            if not raw:
                raw = ""
                for item in getattr(resp, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("output_text", "text"):
                            raw += getattr(c, "text", "")

            return json.loads(raw)

        else:
            raise RuntimeError(f"Unknown AI provider: {provider}")

    def _post_process_alternative_items(
        self, result: Dict[str, Any], measurement: Optional[MeasurementProfile], req: AlternativeItemsRequest,
    ) -> Dict[str, Any]:
        """Post-process alternative items to ensure consistency."""
        items = result.get("items", [])
        processed_items = []

        for it in items:
            cat_norm = normalize_category(it.get("category"))
            if cat_norm != req.category:
                # Skip items that don't match the requested category
                continue

            it["category"] = cat_norm
            if not it.get("currency"):
                it["currency"] = req.currency
            if not it.get("purchase_url"):
                urls = it.get("source_urls") or []
                it["purchase_url"] = urls[0] if urls else None
            it["recommended_size"] = self._recommended_size(cat_norm, measurement)
            processed_items.append(it)

        return {"items": processed_items[:req.num_alternatives]}

    def _get_mock_alternatives(self, req: AlternativeItemsRequest, measurement: Optional[MeasurementProfile]) -> Dict[str, Any]:
        """Get mock alternative items for testing."""
        occasion = (req.occasion or "casual").lower()
        category_upper = req.category.upper()

        # Get items from mock data
        occasion_data = MOCK_PRODUCTS.get(occasion) or MOCK_PRODUCTS.get("casual", {})

        all_items = []
        if isinstance(occasion_data, dict) and "outfits" in occasion_data:
            for outfit in occasion_data["outfits"]:
                all_items.extend(outfit.get("items", []))
        elif isinstance(occasion_data, list):
            all_items = occasion_data

        # Filter by category
        matching_items = [
            item for item in all_items
            if normalize_category(item.get("category")) == req.category
        ]

        # Add recommended size
        result_items = []
        for it in matching_items[:req.num_alternatives]:
            item = dict(it)
            item["recommended_size"] = self._recommended_size(item.get("category"), measurement)
            result_items.append(item)

        return {"items": result_items}
