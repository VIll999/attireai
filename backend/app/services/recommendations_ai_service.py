from openai import OpenAI
from sqlalchemy.orm import Session

import json
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.db.models import (
    User,
    MeasurementProfile,
    ColorProfile,
    StylePreferences,
    OutfitRecommendation,
    RecommendationItem,
)
from app.models.recommendations_ai import AIWebCandidatesRequest, AIWebCandidatesResponse


settings = get_settings()

ALLOWED_CATEGORIES = {"TOP", "BOTTOM", "SHOES", "ACCESSORY", "OUTERWEAR", "OTHER"}


def normalize_category(raw: Optional[str]) -> Optional[str]:
    """
    Normalize arbitrary category text (from LLM / web) into DB enum.
    Returns one of: TOP/BOTTOM/SHOES/ACCESSORY/OUTERWEAR or None.
    """
    if not raw:
        return None

    s = raw.strip().upper()

    if s in ALLOWED_CATEGORIES:
        return None if s == "OTHER" else s

    mapping = {
        # outerwear
        "JACKET": "OUTERWEAR",
        "COAT": "OUTERWEAR",
        "PUFFER": "OUTERWEAR",
        "BLAZER": "OUTERWEAR",
        "HOODIE": "OUTERWEAR",
        "SWEATSHIRT": "OUTERWEAR",
        "CARDIGAN": "OUTERWEAR",
        # top
        "TOPS": "TOP",
        "TSHIRT": "TOP",
        "T-SHIRT": "TOP",
        "SHIRT": "TOP",
        "DRESS SHIRT": "TOP",
        "POLO": "TOP",
        "SWEATER": "TOP",
        # bottom
        "PANTS": "BOTTOM",
        "TROUSERS": "BOTTOM",
        "JEANS": "BOTTOM",
        "SHORTS": "BOTTOM",
        "SKIRT": "BOTTOM",
        # shoes
        "FOOTWEAR": "SHOES",
        "SNEAKERS": "SHOES",
        "BOOTS": "SHOES",
        "LOAFERS": "SHOES",
        "RUNNING SHOES": "SHOES",
        # accessory
        "BAG": "ACCESSORY",
        "BACKPACK": "ACCESSORY",
        "HAT": "ACCESSORY",
        "CAP": "ACCESSORY",
        "BELT": "ACCESSORY",
        "WATCH": "ACCESSORY",
        "SCARF": "ACCESSORY",
        "GLOVES": "ACCESSORY",
        "SUNGLASSES": "ACCESSORY",
        "JEWELRY": "ACCESSORY",
    }

    if s in mapping:
        return mapping[s]

    if any(k in s for k in ["JACKET", "COAT", "OUTER", "PUFFER", "BLAZER", "HOODIE"]):
        return "OUTERWEAR"
    if any(k in s for k in ["PANT", "JEAN", "TROUSER", "SHORT", "SKIRT"]):
        return "BOTTOM"
    if any(k in s for k in ["SHOE", "SNEAKER", "BOOT", "LOAFER"]):
        return "SHOES"
    if any(k in s for k in ["HAT", "CAP", "BAG", "BELT", "WATCH", "SCARF", "GLOVE", "SUNGLASS", "JEWEL"]):
        return "ACCESSORY"
    if any(k in s for k in ["SHIRT", "TEE", "TOP", "POLO", "SWEATER"]):
        return "TOP"

    return None


def _json_schema() -> Dict[str, Any]:
    # v2 schema: include brand/price/image_url/purchase_url/recommended_color
    return {
        "name": "web_candidate_products_v2",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "items": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 20,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "name": {"type": "string"},
                            "brand": {"type": ["string", "null"]},
                            "category": {
                                "type": ["string", "null"],
                                "enum": ["TOP", "BOTTOM", "SHOES", "ACCESSORY", "OUTERWEAR", "OTHER", None],
                            },
                            "reasoning": {"type": "string"},
                            "query_terms": {
                                "type": "array",
                                "items": {"type": "string"},
                                "maxItems": 12,
                            },
                            "source_urls": {
                                "type": "array",
                                "items": {"type": "string"},
                                "maxItems": 6,
                            },
                            "price": {"type": ["number", "null"]},
                            "currency": {"type": ["string", "null"]},
                            "image_url": {"type": ["string", "null"]},
                            "purchase_url": {"type": ["string", "null"]},
                            "recommended_color": {"type": ["string", "null"]},
                        },
                        "required": [
                            "name",
                            "brand",
                            "category",
                            "reasoning",
                            "query_terms",
                            "source_urls",
                            "price",
                            "currency",
                            "image_url",
                            "purchase_url",
                            "recommended_color",
                        ],
                    },
                }
            },
            "required": ["items"],
        },
        "strict": True,
    }


def _to_text_format(schema_obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    OpenAI Responses API json_schema format (requires name/schema/strict).
    """
    return {
        "format": {
            "type": "json_schema",
            "name": schema_obj["name"],
            "schema": schema_obj["schema"],
            "strict": schema_obj.get("strict", True),
        }
    }


class RecommendationsAIService:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is missing in environment")
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model or "gpt-4.1-mini"

    # ---- DB helpers ----
    def _get_user_by_uid(self, db: Session, firebase_uid: str) -> User:
        if not firebase_uid:
            raise ValueError("Missing Firebase UID header")
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        if not user:
            raise ValueError("User not found")
        return user

    def _get_measurement_profile(
        self,
        db: Session,
        user_id: str,
        measurement_profile_id: Optional[str],
    ) -> Optional[MeasurementProfile]:
        if measurement_profile_id:
            return (
                db.query(MeasurementProfile)
                .filter(
                    MeasurementProfile.id == measurement_profile_id,
                    MeasurementProfile.user_id == user_id,
                )
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

    # ---- Weather resolver ----
    def _resolve_weather_if_needed(self, req: AIWebCandidatesRequest) -> None:
        """
        If location exists but weather missing, try web_search to fill weather.
        If OpenAI quota is insufficient, silently skip (fallback will still work).
        """
        loc = req.context_overrides.location
        we = req.context_overrides.weather
        if not loc or we:
            return

        schema = {
            "name": "weather_lookup",
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {"weather": {"type": "string"}},
                "required": ["weather"],
            },
            "strict": True,
        }

        system_prompt = (
            "Use web search to find the current weather summary for the given location. "
            "Return ONLY JSON that matches the schema. Keep it short like: "
            '"10C rainy" / "32F snow" / "18C clear".'
        )

        try:
            resp = self.client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps({"location": loc}, ensure_ascii=False)},
                ],
                tools=[{"type": "web_search"}],
                text=_to_text_format(schema),
            )

            raw = getattr(resp, "output_text", None)
            if not raw:
                raw = ""
                for item in getattr(resp, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("output_text", "text"):
                            raw += getattr(c, "text", "")

            data = json.loads(raw)
            weather = (data.get("weather") or "").strip()
            if weather:
                req.context_overrides.weather = weather

        except Exception as e:
            msg = str(e)
            # quota / rate-limit / any OpenAI failure: skip weather (fallback still works)
            if "insufficient_quota" in msg or "Error code: 429" in msg:
                return
            return

    # ---- Size recommendation (demo mapping) ----
    def _recommended_size_demo(
        self,
        category: Optional[str],
        measurement: Optional[MeasurementProfile],
    ) -> Optional[str]:
        if not category or not measurement:
            return None

        cat = category.upper()
        chest = float(measurement.chest) if measurement.chest is not None else None
        waist = float(measurement.waist) if measurement.waist is not None else None

        if cat in ("TOP", "OUTERWEAR"):
            if chest is None:
                return None
            if chest < 34:
                return "XS"
            if chest < 38:
                return "S"
            if chest < 42:
                return "M"
            if chest < 46:
                return "L"
            return "XL"

        if cat == "BOTTOM":
            if waist is None:
                return None
            w_int = int(round(waist))
            return f"W{w_int}"

        return None

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

        payload: Dict[str, Any] = {
            "user": {
                "id": user.id,
                "subscription_tier": user.subscription_tier,
            },
            "context": {
                "occasion": overrides.get("occasion"),
                "weather": overrides.get("weather"),
                "location": overrides.get("location"),
                "dress_code": overrides.get("dress_code"),
                "budget": (overrides.get("extra") or {}).get("budget"),
                "currency": (overrides.get("extra") or {}).get("currency") or req.currency,
                "styles": (overrides.get("extra") or {}).get("styles"),
                "gender": (overrides.get("extra") or {}).get("gender"),
            },
            "measurement_profile": None,
            "color_profile": None,
            "style_preference": None,
            "allowed_categories": sorted(list(ALLOWED_CATEGORIES)),
            "categories": req.categories,
            "k": req.k,
            "rules": [
                "use web_search to find real products",
                "do not invent prices/stock",
                "if price is unknown, set price = null",
                "image_url and purchase_url should be real links when available",
                "each item must include source_urls",
                "category MUST be one of allowed_categories or null",
                "consider measurement_profile to suggest size guidance",
                "consider color_profile palette to suggest colors",
                "consider style_preference and requested styles",
            ],
        }

        if measurement:
            payload["measurement_profile"] = {
                "id": measurement.id,
                "name": measurement.name,
                "height": float(measurement.height) if measurement.height is not None else None,
                "weight": float(measurement.weight) if measurement.weight is not None else None,
                "chest": float(measurement.chest) if measurement.chest is not None else None,
                "waist": float(measurement.waist) if measurement.waist is not None else None,
                "hip": float(measurement.hip) if measurement.hip is not None else None,
                "inseam": float(measurement.inseam) if measurement.inseam is not None else None,
                "shoulder_width": float(measurement.shoulder_width) if measurement.shoulder_width is not None else None,
                "arm_length": float(measurement.arm_length) if measurement.arm_length is not None else None,
                "is_primary": bool(measurement.is_primary),
                "source": measurement.source,
            }

        if color:
            payload["color_profile"] = {
                "skin_tone": color.skin_tone,
                "skin_tone_hex": color.skin_tone_hex,
                "hair_color": color.hair_color,
                "hair_color_hex": color.hair_color_hex,
                "recommended_palette": color.recommended_palette,
            }

        if style:
            payload["style_preference"] = {
                "preferred_styles": style.preferred_styles,
                "avoided_styles": style.avoided_styles,
                "price_range": style.price_range,
                "preferred_brands": style.preferred_brands,
                "excluded_brands": style.excluded_brands,
            }

        return payload

    # ---- OpenAI call ----
    def _call_openai_web_search(self, context_payload: Dict[str, Any]) -> Dict[str, Any]:
        system_prompt = (
            "You are a product discovery assistant.\n"
            "Use web_search to find candidate products that match the user's context and preferences.\n"
            "Return ONLY JSON matching the provided schema.\n"
            "IMPORTANT:\n"
            "- Do NOT invent prices or availability.\n"
            "- If price is not clearly found, set price=null.\n"
            "- Each item must include source_urls from web search results.\n"
            "- Provide image_url and purchase_url when possible (real links).\n"
            "- Avoid near-duplicates; keep results diverse.\n"
        )

        schema = _json_schema()
        resp = self.client.responses.create(
            model=self.model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(context_payload, ensure_ascii=False)},
            ],
            tools=[{"type": "web_search"}],
            text=_to_text_format(schema),
        )

        raw = getattr(resp, "output_text", None)
        if not raw:
            raw = ""
            for item in getattr(resp, "output", []) or []:
                for c in getattr(item, "content", []) or []:
                    if getattr(c, "type", None) in ("output_text", "text"):
                        raw += getattr(c, "text", "")

        return json.loads(raw)

    # ---- Fallback candidates (no OpenAI quota) ----
    def _fallback_candidates(
        self,
        measurement: Optional[MeasurementProfile],
        color: Optional[ColorProfile],
        style: Optional[StylePreferences],
        req: AIWebCandidatesRequest,
    ) -> List[Dict[str, Any]]:
        """
        Local fallback: return top/bottom/shoes/accessory each 1 item.
        price uses budget/4 if available. No web links.
        """
        overrides = req.context_overrides.model_dump()
        extra = overrides.get("extra") or {}

        # budget/currency
        budget = extra.get("budget")
        currency = (extra.get("currency") or req.currency or "USD")[:3]
        per_item_price: Optional[float] = None
        try:
            if budget is not None:
                per_item_price = float(budget) / 4.0
        except Exception:
            per_item_price = None

        # style hint
        styles_req = extra.get("styles") or []
        if isinstance(styles_req, str):
            styles_req = [styles_req]
        styles_db: List[str] = []
        try:
            if style and style.preferred_styles:
                if isinstance(style.preferred_styles, list):
                    styles_db = style.preferred_styles
                else:
                    styles_db = [str(style.preferred_styles)]
        except Exception:
            styles_db = []
        style_hint = ", ".join(list(dict.fromkeys([*styles_req, *styles_db]))[:4])

        # color hint
        color_hint: Optional[str] = None
        try:
            pal = color.recommended_palette if color else None
            if isinstance(pal, list) and pal:
                color_hint = str(pal[0])
            elif isinstance(pal, str) and pal.strip():
                color_hint = pal.split(",")[0].strip()
        except Exception:
            color_hint = None

        def mk(cat: str, name: str) -> Dict[str, Any]:
            return {
                "name": name,
                "brand": None,
                "category": cat,
                "reasoning": (
                    "Fallback mode (no OpenAI quota). "
                    f"Occasion={overrides.get('occasion') or 'N/A'}, "
                    f"Weather={overrides.get('weather') or 'N/A'}, "
                    f"Style={style_hint or 'N/A'}."
                ),
                "query_terms": [name, (overrides.get("occasion") or "outfit"), (style_hint or "style")],
                "source_urls": [],
                "price": per_item_price,
                "currency": currency,
                "image_url": None,
                "purchase_url": None,
                "recommended_color": color_hint,
                "recommended_size": None,  # computed later in _post_process_items
            }

        items = [
            mk("TOP", "Basic top (fallback)"),
            mk("BOTTOM", "Basic bottom (fallback)"),
            mk("SHOES", "Comfort shoes (fallback)"),
            mk("ACCESSORY", "Simple accessory (fallback)"),
        ]

        # apply categories filter if user specified
        if getattr(req, "categories", None):
            allowed = set(req.categories)
            items = [it for it in items if it.get("category") in allowed]
            if not items:
                items = [mk("TOP", "Basic top (fallback)")]

        return items[: getattr(req, "k", 8)]

    # ---- Post process (recommended_size etc.) ----
    def _post_process_items(
        self,
        result: Dict[str, Any],
        measurement: Optional[MeasurementProfile],
        req: AIWebCandidatesRequest,
    ) -> Dict[str, Any]:
        items: List[Dict[str, Any]] = result.get("items", []) or []
        currency_default = (req.context_overrides.extra or {}).get("currency") or req.currency or "USD"

        for it in items:
            cat_norm = normalize_category(it.get("category"))
            it["category"] = cat_norm

            if not it.get("currency"):
                it["currency"] = currency_default

            if not it.get("purchase_url"):
                urls = it.get("source_urls") or []
                it["purchase_url"] = urls[0] if urls else None

            it["recommended_size"] = self._recommended_size_demo(cat_norm, measurement)

        result["items"] = items
        return result

    # ---- Persist ----
    def _persist(
        self,
        db: Session,
        user_id: str,
        req: AIWebCandidatesRequest,
        result: Dict[str, Any],
    ) -> str:
        rec = OutfitRecommendation(
            user_id=user_id,
            occasion=req.context_overrides.occasion,
            weather=req.context_overrides.weather,
            dress_code=req.context_overrides.dress_code,
            reasoning="AI web candidates generated (web_search; price may be null if unknown).",
        )
        db.add(rec)
        db.flush()

        items: List[Dict[str, Any]] = result.get("items", []) or []
        for it in items:
            name = (it.get("name") or "").strip() or "Unknown Item"
            category = normalize_category(it.get("category"))

            brand = it.get("brand") or None
            image_url = it.get("image_url") or None
            purchase_url = it.get("purchase_url") or None
            recommended_size = it.get("recommended_size") or None

            price_val = it.get("price")
            price_dec: Optional[Decimal] = None
            try:
                if price_val is not None:
                    price_dec = Decimal(str(price_val)).quantize(Decimal("0.01"))
            except Exception:
                price_dec = None

            currency = (it.get("currency") or req.currency or "USD")[:3]

            db.add(
                RecommendationItem(
                    recommendation_id=rec.id,
                    name=name,
                    brand=brand,
                    category=category,
                    price=price_dec,
                    currency=currency,
                    image_url=image_url,
                    purchase_url=purchase_url,
                    recommended_size=recommended_size,
                )
            )

        db.commit()
        db.refresh(rec)
        return rec.id

    # ---- Public ----
    def generate_web_candidates(
        self,
        db: Session,
        firebase_uid: str,
        req: AIWebCandidatesRequest,
    ) -> AIWebCandidatesResponse:
        user = self._get_user_by_uid(db, firebase_uid)
        measurement = self._get_measurement_profile(db, user.id, req.measurement_profile_id)
        color = self._get_color_profile(db, user.id)
        style = self._get_style_preference(db, user.id)

        # Weather fill (best-effort; skips on quota errors)
        self._resolve_weather_if_needed(req)

        context_payload = self._build_context_payload(user, measurement, color, style, req)

        # quota fallback
        try:
            result = self._call_openai_web_search(context_payload)
        except Exception as e:
            msg = str(e)
            if "insufficient_quota" in msg or "Error code: 429" in msg:
                result = {"items": self._fallback_candidates(measurement, color, style, req)}
            else:
                raise

        result = self._post_process_items(result, measurement, req)

        recommendation_id: Optional[str] = None
        if req.save_to_db:
            recommendation_id = self._persist(db, user.id, req, result)

        debug = {"context_payload": context_payload, "fallback_used": ("items" in result and not any((it.get("source_urls") for it in result.get("items", []))))}

        return AIWebCandidatesResponse.model_validate(
            {"recommendation_id": recommendation_id, "items": result.get("items", []), "debug": debug}
        )