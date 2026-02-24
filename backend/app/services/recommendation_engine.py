from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple
import random

from app.services.catalog_provider import CatalogItem, load_catalog, filter_candidates


# ---------------------------
# Output structures
# ---------------------------

@dataclass
class GeneratedOutfit:
    """A generated outfit (not yet persisted)."""
    occasion: str
    weather: Optional[str]
    dress_code: Optional[str]
    total_price: Decimal
    reasoning: str
    items: List[CatalogItem]


# ---------------------------
# Helpers (style, color, slots)
# ---------------------------

SLOT_CATEGORIES = ["TOP", "BOTTOM", "SHOES"]  # required
OPTIONAL_ACCESSORY = "ACCESSORY"
OPTIONAL_OUTERWEAR = "OUTERWEAR"


def _normalize_list(val: Any) -> List[str]:
    """Accept JSON array / string / None and return list[str]."""
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val if x is not None]
    if isinstance(val, str):
        # if someone stored comma-separated string accidentally
        s = val.strip()
        if not s:
            return []
        return [x.strip() for x in s.split(",") if x.strip()]
    return [str(val)]


def _pick_target_styles(
    occasion: str,
    preferred_styles: Sequence[str],
    avoided_styles: Sequence[str],
) -> List[str]:
    """
    Choose target styles for this recommendation.
    Strategy:
      1) If user has preferred_styles, use them (minus avoided).
      2) Else map occasion -> default style set.
    """
    avoided = {s.lower() for s in avoided_styles if s}
    pref = [s for s in preferred_styles if s and s.lower() not in avoided]

    if pref:
        # keep order but unique
        seen = set()
        out = []
        for s in pref:
            sl = s.lower()
            if sl in seen:
                continue
            seen.add(sl)
            out.append(s)
        return out

    mapping = {
        "work": ["formal", "smart_casual"],
        "daily": ["casual"],
        "party": ["street", "casual"],
        "date": ["smart_casual", "casual"],
    }
    return mapping.get((occasion or "").lower(), ["casual"])


def _weather_needs_outerwear(weather: Optional[str]) -> bool:
    if not weather:
        return False
    w = weather.lower()
    # keep it simple; expand later
    return any(k in w for k in ["cold", "chilly", "snow", "winter", "rain"])


def _dress_code_bias_styles(dress_code: Optional[str], styles: List[str]) -> List[str]:
    """
    Optional: adjust target styles based on dress_code.
    Doesn't remove styles, only reorders/augments.
    """
    if not dress_code:
        return styles

    dc = dress_code.lower()
    # common labels
    if "business" in dc or "formal" in dc:
        # push formal forward
        ordered = ["formal", "smart_casual"] + styles
    elif "casual" in dc:
        ordered = ["casual", "smart_casual"] + styles
    else:
        ordered = styles

    # unique preserve order
    seen = set()
    out = []
    for s in ordered:
        sl = s.lower()
        if sl in seen:
            continue
        seen.add(sl)
        out.append(s)
    return out


def _palette_set(color_profile: Optional[Dict[str, Any]]) -> Set[str]:
    """
    Convert recommended_palette (JSON) into a lowercase set of hex strings.
    We accept:
      - ["#FFFFFF", "#111827"]
      - {"colors": ["#..."]} etc.
    """
    if not color_profile:
        return set()
    pal = color_profile.get("recommended_palette")
    if pal is None:
        return set()

    if isinstance(pal, list):
        return {str(x).lower() for x in pal if x}
    if isinstance(pal, dict):
        maybe = pal.get("colors") or pal.get("palette") or []
        if isinstance(maybe, list):
            return {str(x).lower() for x in maybe if x}
    return set()


def _color_compat_score(item_colors: Sequence[str], palette: Set[str]) -> int:
    """
    Simple score: +1 if any color intersects palette, else 0.
    """
    if not palette or not item_colors:
        return 0
    for c in item_colors:
        if c and str(c).lower() in palette:
            return 1
    return 0


def _compute_outfit_price(items: Sequence[CatalogItem]) -> Decimal:
    total = Decimal("0")
    for it in items:
        if it.price is not None:
            total += it.price
    return total


# ---------------------------
# Core generator
# ---------------------------

def generate_outfits(
    *,
    occasion: str,
    limit: int = 3,
    weather: Optional[str] = None,
    dress_code: Optional[str] = None,
    # user profile inputs (already read from DB by router)
    style_preference: Optional[Dict[str, Any]] = None,
    color_profile: Optional[Dict[str, Any]] = None,
    measurement_profile: Optional[Dict[str, Any]] = None,
) -> List[GeneratedOutfit]:
    """
    Generate N complete outfits from C2 catalog.

    Inputs:
      - occasion (required)
      - limit (default 3)
      - weather/dress_code (optional)
      - style_preference/color_profile/measurement_profile (dict-like from ORM or converted)

    Output:
      - list of GeneratedOutfit (not persisted)
    """

    # ---------- load catalog ----------
    catalog = load_catalog()

    # ---------- extract user preference ----------
    pref_styles = _normalize_list((style_preference or {}).get("preferred_styles"))
    avoided_styles = _normalize_list((style_preference or {}).get("avoided_styles"))
    price_range = (style_preference or {}).get("price_range")  # BUDGET/MID_RANGE/LUXURY
    preferred_brands = _normalize_list((style_preference or {}).get("preferred_brands"))
    excluded_brands = _normalize_list((style_preference or {}).get("excluded_brands"))

    # ---------- determine target styles ----------
    target_styles = _pick_target_styles(occasion, pref_styles, avoided_styles)
    target_styles = _dress_code_bias_styles(dress_code, target_styles)

    # ---------- color palette ----------
    palette = _palette_set(color_profile)

    # ---------- build candidates by slot ----------
    # required slots
    tops = filter_candidates(
        catalog,
        category="TOP",
        occasion=occasion,
        target_styles=target_styles,
        price_range=price_range,
        preferred_brands=preferred_brands,
        excluded_brands=excluded_brands,
    )
    bottoms = filter_candidates(
        catalog,
        category="BOTTOM",
        occasion=occasion,
        target_styles=target_styles,
        price_range=price_range,
        preferred_brands=preferred_brands,
        excluded_brands=excluded_brands,
    )
    shoes = filter_candidates(
        catalog,
        category="SHOES",
        occasion=occasion,
        target_styles=target_styles,
        price_range=price_range,
        preferred_brands=preferred_brands,
        excluded_brands=excluded_brands,
    )

    accessories = filter_candidates(
        catalog,
        category="ACCESSORY",
        occasion=occasion,
        target_styles=target_styles,
        price_range=price_range,
        preferred_brands=preferred_brands,
        excluded_brands=excluded_brands,
    )

    need_outer = _weather_needs_outerwear(weather)
    outerwear = []
    if need_outer:
        outerwear = filter_candidates(
            catalog,
            category="OUTERWEAR",
            occasion=occasion,
            target_styles=target_styles,
            price_range=price_range,
            preferred_brands=preferred_brands,
            excluded_brands=excluded_brands,
        )

    # ---------- fail fast if cannot form outfits ----------
    if not tops or not bottoms or not shoes:
        # Return empty -> router can still return 200 with [] or raise 400. We'll decide in router.
        return []

    # ---------- assemble outfits ----------
    # We want variety: keep used external_product_id sets
    used_signatures: Set[Tuple[str, ...]] = set()
    results: List[GeneratedOutfit] = []

    # heuristic: take top K from each to reduce combination explosion
    K = 12
    tops_k = tops[:K]
    bottoms_k = bottoms[:K]
    shoes_k = shoes[:K]
    accessories_k = accessories[:K]
    outerwear_k = outerwear[:K] if outerwear else []

    # try combos with a bounded attempt count
    max_attempts = 200
    attempts = 0

    while len(results) < max(1, limit) and attempts < max_attempts:
        attempts += 1

        # pick candidates with a slight bias to palette match
        top = _pick_with_palette_bias(tops_k, palette)
        bottom = _pick_with_palette_bias(bottoms_k, palette)
        shoe = _pick_with_palette_bias(shoes_k, palette)

        outfit_items: List[CatalogItem] = [top, bottom, shoe]

        # optional accessory: choose 1 if available
        acc = None
        if accessories_k:
            acc = _pick_with_palette_bias(accessories_k, palette)
            outfit_items.append(acc)

        # optional outerwear if needed and available
        ow = None
        if need_outer and outerwear_k:
            ow = _pick_with_palette_bias(outerwear_k, palette)
            outfit_items.append(ow)

        # signature for uniqueness (sorted IDs to ignore order)
        sig = tuple(sorted([it.external_product_id for it in outfit_items]))
        if sig in used_signatures:
            continue

        used_signatures.add(sig)

        total_price = _compute_outfit_price(outfit_items)
        reasoning = _build_reasoning(
            occasion=occasion,
            weather=weather,
            dress_code=dress_code,
            target_styles=target_styles,
            preferred_brands=preferred_brands,
            palette=palette,
            items=outfit_items,
        )

        results.append(
            GeneratedOutfit(
                occasion=occasion,
                weather=weather,
                dress_code=dress_code,
                total_price=total_price,
                reasoning=reasoning,
                items=outfit_items,
            )
        )

    return results[: max(1, limit)]


def _pick_with_palette_bias(candidates: Sequence[CatalogItem], palette: Set[str]) -> CatalogItem:
    """
    Pick an item from candidates with slight bias:
      - items intersecting palette more likely
    """
    if not candidates:
        raise ValueError("No candidates to pick from")

    # If no palette, just random among first few for variety
    if not palette:
        return random.choice(list(candidates[: min(8, len(candidates))]))

    # Build weighted list
    weighted: List[Tuple[CatalogItem, int]] = []
    for it in candidates[: min(20, len(candidates))]:
        score = 1 + _color_compat_score(it.colors, palette)  # 1 or 2
        weighted.append((it, score))

    total_w = sum(w for _, w in weighted)
    r = random.randint(1, total_w)
    cur = 0
    for it, w in weighted:
        cur += w
        if r <= cur:
            return it
    return weighted[-1][0]


def _build_reasoning(
    *,
    occasion: str,
    weather: Optional[str],
    dress_code: Optional[str],
    target_styles: Sequence[str],
    preferred_brands: Sequence[str],
    palette: Set[str],
    items: Sequence[CatalogItem],
) -> str:
    """
    Simple, demo-friendly reasoning text.
    Keep it short and explainable.
    """
    style_part = f"Target style: {', '.join(target_styles[:2])}" if target_styles else "Target style: casual"
    cond_parts = [f"Occasion: {occasion}"]
    if weather:
        cond_parts.append(f"Weather: {weather}")
    if dress_code:
        cond_parts.append(f"Dress code: {dress_code}")

    brand_hits = []
    pref_set = {b.lower() for b in preferred_brands if b}
    for it in items:
        if it.brand and it.brand.lower() in pref_set:
            brand_hits.append(it.brand)

    palette_hits = 0
    if palette:
        for it in items:
            palette_hits += _color_compat_score(it.colors, palette)

    item_names = "; ".join([f"{it.category}:{it.name}" for it in items])

    extras = []
    if brand_hits:
        extras.append(f"Preferred brands included: {', '.join(sorted(set(brand_hits)))}")
    if palette:
        extras.append(f"Palette match signals: {palette_hits}")

    extra_text = (" | " + " | ".join(extras)) if extras else ""
    return f"{', '.join(cond_parts)}. {style_part}. Items: {item_names}.{extra_text}"