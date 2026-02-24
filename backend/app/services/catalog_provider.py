import json
import os
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class CatalogItem:
    """Internal normalized catalog item structure (source: C2 JSON catalog)."""
    external_product_id: str
    name: str
    brand: Optional[str]
    category: str  # TOP/BOTTOM/SHOES/ACCESSORY/OUTERWEAR
    price: Optional[Decimal]
    currency: str
    image_url: Optional[str]
    purchase_url: Optional[str]
    colors: List[str]
    material: Optional[str]
    styles: List[str]
    occasions: List[str]


# Keep catalog path inside app/services as requested.
CATALOG_FILENAME = "product_catalog.json"


def _services_dir() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def _catalog_path() -> str:
    return os.path.join(_services_dir(), CATALOG_FILENAME)


def load_catalog() -> List[CatalogItem]:
    """Load C2 catalog from app/services/product_catalog.json"""
    path = _catalog_path()
    if not os.path.exists(path):
        raise FileNotFoundError(f"Catalog file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    items: List[CatalogItem] = []
    for r in raw:
        # Defensive defaults
        external_id = str(r.get("external_product_id") or "")
        name = str(r.get("name") or "")
        if not external_id or not name:
            # Skip invalid entries
            continue

        brand = r.get("brand")
        category = str(r.get("category") or "").upper()

        # price may be int/float/str -> Decimal
        price_val = r.get("price", None)
        price: Optional[Decimal] = None
        if price_val is not None and price_val != "":
            try:
                price = Decimal(str(price_val))
            except Exception:
                price = None

        currency = str(r.get("currency") or "USD").upper()
        image_url = r.get("image_url")
        purchase_url = r.get("purchase_url")
        colors = r.get("colors") or []
        material = r.get("material")

        styles = r.get("styles") or []
        occasions = r.get("occasions") or []

        # Normalize list fields to list[str]
        colors = [str(x) for x in colors if x is not None]
        styles = [str(x) for x in styles if x is not None]
        occasions = [str(x) for x in occasions if x is not None]

        items.append(
            CatalogItem(
                external_product_id=external_id,
                name=name,
                brand=str(brand) if brand else None,
                category=category,
                price=price,
                currency=currency,
                image_url=str(image_url) if image_url else None,
                purchase_url=str(purchase_url) if purchase_url else None,
                colors=colors,
                material=str(material) if material else None,
                styles=styles,
                occasions=occasions,
            )
        )
    return items


def _price_range_to_bounds(price_range: Optional[str]) -> Tuple[Optional[Decimal], Optional[Decimal]]:
    """
    Map DB enum price_range (BUDGET/MID_RANGE/LUXURY) to rough USD bounds.
    You can adjust these later without touching the rest of the engine.
    """
    if not price_range:
        return (None, None)

    pr = price_range.upper()
    if pr == "BUDGET":
        return (None, Decimal("50"))
    if pr == "MID_RANGE":
        return (Decimal("25"), Decimal("150"))
    if pr == "LUXURY":
        return (Decimal("80"), None)
    return (None, None)


def filter_candidates(
    catalog: Sequence[CatalogItem],
    *,
    category: str,
    occasion: Optional[str],
    target_styles: Optional[Sequence[str]],
    price_range: Optional[str],
    preferred_brands: Optional[Sequence[str]],
    excluded_brands: Optional[Sequence[str]],
) -> List[CatalogItem]:
    """
    Filter candidate items for a specific slot/category.
    - category: one of TOP/BOTTOM/SHOES/ACCESSORY/OUTERWEAR
    - occasion: e.g. work/daily/party/date
    - target_styles: e.g. ["formal","smart_casual"]
    """
    cat = (category or "").upper()
    occ = (occasion or "").strip().lower() if occasion else None

    styles_set = set(s.lower() for s in (target_styles or []) if s)
    pref_brand_set = set(b.lower() for b in (preferred_brands or []) if b)
    excl_brand_set = set(b.lower() for b in (excluded_brands or []) if b)

    min_p, max_p = _price_range_to_bounds(price_range)

    out: List[CatalogItem] = []
    for it in catalog:
        # category match
        if it.category != cat:
            continue

        # occasion match (if provided)
        if occ:
            occs = {o.lower() for o in it.occasions}
            if occ not in occs:
                continue

        # style match (if provided)
        if styles_set:
            it_styles = {s.lower() for s in it.styles}
            if it_styles.isdisjoint(styles_set):
                continue

        # brand exclude
        if it.brand and it.brand.lower() in excl_brand_set:
            continue

        # price range bounds
        if it.price is not None:
            if min_p is not None and it.price < min_p:
                continue
            if max_p is not None and it.price > max_p:
                continue

        out.append(it)

    # Simple ranking: preferred brands first, then cheaper first (stable & easy for demo)
    def _rank_key(x: CatalogItem):
        brand_hit = 1 if (x.brand and x.brand.lower() in pref_brand_set) else 0
        price_val = x.price if x.price is not None else Decimal("999999")
        return (-brand_hit, price_val)

    out.sort(key=_rank_key)
    return out