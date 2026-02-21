"""
Size recommendation engine.

Takes user measurements (chest, waist, hip in CM) and returns
brand-specific size recommendations with fit scores and body type analysis.
"""

import json
import os
from typing import Optional

# Load brand size charts once at module level
_CHARTS_PATH = os.path.join(os.path.dirname(__file__), "size_charts.json")
with open(_CHARTS_PATH, "r") as f:
    _SIZE_DATA = json.load(f)

BRANDS = _SIZE_DATA["brands"]

# Body type definitions
BODY_TYPES = {
    "Hourglass": "Balanced chest and hips with a well-defined waist",
    "Pear": "Hips wider than chest with a defined waist",
    "Inverted Triangle": "Chest broader than hips with athletic shoulders",
    "Rectangle": "Chest, waist, and hips are similar in proportion",
    "Apple": "Fuller midsection with waist close to or wider than hips",
}


def classify_body_type(chest: float, waist: float, hip: float) -> str:
    """Classify body type from chest/waist/hip measurements (CM)."""
    chest_hip_ratio = chest / hip if hip > 0 else 1.0
    waist_hip_ratio = waist / hip if hip > 0 else 1.0
    waist_chest_ratio = waist / chest if chest > 0 else 1.0

    # Hourglass: chest ≈ hip (within 5%), waist notably smaller
    if 0.95 <= chest_hip_ratio <= 1.05 and waist_chest_ratio < 0.80:
        return "Hourglass"

    # Apple: waist is large relative to hip or chest
    if waist_hip_ratio > 0.90 or waist_chest_ratio > 0.90:
        return "Apple"

    # Pear: hips notably wider than chest
    if chest_hip_ratio < 0.90:
        return "Pear"

    # Inverted Triangle: chest notably wider than hips
    if chest_hip_ratio > 1.10:
        return "Inverted Triangle"

    # Rectangle: everything roughly proportional
    return "Rectangle"


def _fit_measurement(value: float, range_min: float, range_max: float) -> dict:
    """
    Calculate how well a single measurement fits a size range.

    Returns:
        dict with position (0.0-1.0), in_range (bool), and distance from range.
    """
    range_span = range_max - range_min
    if range_span <= 0:
        return {"position": 0.5, "in_range": False, "distance": 0}

    position = (value - range_min) / range_span
    in_range = 0.0 <= position <= 1.0
    distance = 0 if in_range else min(abs(value - range_min), abs(value - range_max))

    return {
        "position": max(0.0, min(1.0, position)),
        "in_range": in_range,
        "distance": distance,
    }


def _score_size(chest: float, waist: float, hip: float, size_chart: dict) -> dict:
    """Score how well measurements fit a specific size."""
    chest_fit = _fit_measurement(chest, size_chart["chest"][0], size_chart["chest"][1])
    waist_fit = _fit_measurement(waist, size_chart["waist"][0], size_chart["waist"][1])
    hip_fit = _fit_measurement(hip, size_chart["hip"][0], size_chart["hip"][1])

    # Count how many measurements are in range
    in_range_count = sum(1 for f in [chest_fit, waist_fit, hip_fit] if f["in_range"])

    # Calculate fit score (0-100)
    # Penalize distance from range, reward being centered
    total_distance = chest_fit["distance"] + waist_fit["distance"] + hip_fit["distance"]

    if in_range_count == 3:
        # All in range — score based on how centered (closer to 0.5 = better)
        center_deviation = (
            abs(chest_fit["position"] - 0.5)
            + abs(waist_fit["position"] - 0.5)
            + abs(hip_fit["position"] - 0.5)
        ) / 3.0
        score = round(90 + (1 - center_deviation) * 10)
    elif in_range_count == 2:
        score = round(max(60, 80 - total_distance))
    elif in_range_count == 1:
        score = round(max(30, 55 - total_distance * 2))
    else:
        score = round(max(10, 35 - total_distance * 3))

    score = max(0, min(100, score))

    return {
        "score": score,
        "total_distance": total_distance,
        "in_range_count": in_range_count,
        "chest": {
            "size_range": size_chart["chest"],
            "user_value": round(chest, 1),
            "position": round(chest_fit["position"], 2),
            "in_range": chest_fit["in_range"],
        },
        "waist": {
            "size_range": size_chart["waist"],
            "user_value": round(waist, 1),
            "position": round(waist_fit["position"], 2),
            "in_range": waist_fit["in_range"],
        },
        "hip": {
            "size_range": size_chart["hip"],
            "user_value": round(hip, 1),
            "position": round(hip_fit["position"], 2),
            "in_range": hip_fit["in_range"],
        },
    }


def _determine_confidence(score: int, fit_details: dict) -> str:
    """Determine confidence label from fit score and details."""
    if score >= 80:
        return "Best Fit"
    if score >= 60:
        # Check direction of misfit
        positions = [
            fit_details["chest"]["position"],
            fit_details["waist"]["position"],
            fit_details["hip"]["position"],
        ]
        avg_position = sum(positions) / len(positions)
        if avg_position > 0.8:
            return "May Run Small"
        if avg_position < 0.2:
            return "May Run Large"
        return "Good Fit"
    # Low score — determine direction
    positions = [
        fit_details["chest"]["position"],
        fit_details["waist"]["position"],
        fit_details["hip"]["position"],
    ]
    avg_position = sum(positions) / len(positions)
    if avg_position > 0.5:
        return "May Run Small"
    return "May Run Large"


def get_size_recommendations(
    chest: float,
    waist: float,
    hip: float,
    gender: str = "male",
) -> dict:
    """
    Get size recommendations across all brands.

    Args:
        chest: Chest measurement in CM
        waist: Waist measurement in CM
        hip: Hip measurement in CM
        gender: "male" or "female"

    Returns:
        dict with body_type info and list of brand recommendations
    """
    body_type = classify_body_type(chest, waist, hip)
    gender_key = "men" if gender == "male" else "women"

    recommendations = []

    for brand in BRANDS:
        size_chart = brand.get(gender_key)
        if not size_chart:
            continue

        # Score each available size
        best_size = None
        best_result = None

        for size_label, ranges in size_chart.items():
            result = _score_size(chest, waist, hip, ranges)
            if best_result is None or result["score"] > best_result["score"] or (
                result["score"] == best_result["score"]
                and result["total_distance"] < best_result["total_distance"]
            ):
                best_size = size_label
                best_result = result

        if best_size and best_result:
            confidence = _determine_confidence(best_result["score"], best_result)
            recommendations.append({
                "brand": brand["name"],
                "category": brand["category"],
                "sizing_notes": brand["sizing_notes"],
                "recommended_size": best_size,
                "confidence": confidence,
                "fit_score": best_result["score"],
                "fit_details": {
                    "chest": best_result["chest"],
                    "waist": best_result["waist"],
                    "hip": best_result["hip"],
                },
            })

    # Sort by fit score descending
    recommendations.sort(key=lambda r: r["fit_score"], reverse=True)

    return {
        "body_type": body_type,
        "body_type_description": BODY_TYPES[body_type],
        "recommendations": recommendations,
    }
