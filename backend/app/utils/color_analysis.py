"""
Color analysis utility - Browser-based color recommendation algorithm
Based on 12-Season Color Theory without AI
"""

from typing import Dict, List, Tuple, Any


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Convert RGB to hex color."""
    return f"#{r:02x}{g:02x}{b:02x}"


def get_luminance(hex_color: str) -> float:
    """Calculate relative luminance of a color (0-255)."""
    r, g, b = hex_to_rgb(hex_color)
    # Using perceived brightness formula
    return 0.299 * r + 0.587 * g + 0.114 * b


def detect_undertone(skin_hex: str) -> str:
    """
    Detect skin undertone based on RGB values.

    Warm: Golden/peachy (yellow tones) - G is relatively high, G > B significantly
    Cool: Pink/rosy tones - B is relatively high, or R high with B close to G
    Neutral: Balanced tones

    Method: Use color temperature score based on Yellow-Blue axis
    """
    r, g, b = hex_to_rgb(skin_hex)

    # Avoid division by zero
    if r + g + b == 0:
        return "Neutral"

    # Calculate color temperature on Yellow-Blue axis
    # Yellow = R + G (warm), Blue = B (cool)
    # Normalize to get a temperature score from -1 (cool) to +1 (warm)

    # Method 1: Yellow vs Blue strength
    yellow_strength = (r + g) / 2  # Average of red and green (makes yellow)
    blue_strength = b

    # Temperature score: positive = warm, negative = cool
    temp_diff = yellow_strength - blue_strength

    # Method 2: Check G vs B ratio (warm skin has more green/yellow)
    g_b_ratio = g / (b + 1)  # +1 to avoid division by zero

    # Method 3: Pink detection (cool undertone with high red)
    # Cool pink skin: R is high, but B is close to or higher than G
    is_pink = (r > g) and (b >= g - 10) and (b > 170)  # Pink tones

    # Decision logic
    # Warm: Strong yellow tones (G significantly > B)
    if temp_diff > 35 and g_b_ratio > 1.15:
        return "Warm"

    # Cool: Pink tones OR blue is relatively strong
    if is_pink or (temp_diff < 25 and g_b_ratio < 1.05):
        return "Cool"

    # Neutral: Everything in between
    return "Neutral"


def calculate_contrast(skin_hex: str, hair_hex: str) -> str:
    """
    Calculate contrast level between skin and hair.
    High: Strong difference (e.g., fair skin + black hair) - difference > 100
    Medium: Moderate difference - difference 50-100
    Low: Similar tones - difference < 50

    Luminance range: 0 (black) to 255 (white)
    Examples:
    - Fair skin (~210) + Black hair (~30) = 180 difference → High
    - Medium skin (~160) + Brown hair (~80) = 80 difference → Medium
    - Tan skin (~130) + Dark blonde (~120) = 10 difference → Low
    """
    skin_lum = get_luminance(skin_hex)
    hair_lum = get_luminance(hair_hex)

    difference = abs(skin_lum - hair_lum)

    # Adjusted thresholds for more accurate classification
    if difference > 100:
        return "High"
    elif difference > 50:
        return "Medium"
    else:
        return "Low"


def determine_season(skin_hex: str, hair_hex: str, undertone: str, contrast: str) -> str:
    """
    Determine color season based on undertone, skin tone, hair color, and contrast.
    Uses simplified 12-Season Color Theory.
    """
    skin_lum = get_luminance(skin_hex)
    hair_lum = get_luminance(hair_hex)

    # Classify skin lightness
    if skin_lum > 180:
        skin_depth = "Fair"
    elif skin_lum > 120:
        skin_depth = "Medium"
    else:
        skin_depth = "Deep"

    # Classify hair lightness
    if hair_lum > 150:
        hair_depth = "Light"
    elif hair_lum > 80:
        hair_depth = "Medium"
    else:
        hair_depth = "Dark"

    # Season mapping logic
    if undertone == "Warm":
        if skin_depth == "Fair" and hair_depth in ["Light", "Medium"]:
            return "Light Spring" if contrast == "Low" else "Warm Spring"
        elif skin_depth == "Medium" and hair_depth == "Medium":
            return "Warm Spring"
        elif skin_depth in ["Medium", "Deep"] and hair_depth in ["Medium", "Dark"]:
            return "Warm Autumn"
        else:
            return "Deep Autumn"

    elif undertone == "Cool":
        if skin_depth == "Fair" and hair_depth == "Light":
            return "Light Summer"
        elif skin_depth == "Fair" and hair_depth in ["Medium", "Dark"]:
            return "Cool Summer" if contrast == "High" else "Soft Summer"
        elif skin_depth == "Medium":
            return "Soft Summer"
        elif contrast == "High":
            return "Bright Winter"
        else:
            return "Cool Winter"

    else:  # Neutral
        if contrast == "High":
            return "Bright Winter"
        elif skin_depth == "Fair":
            return "Light Summer"
        elif hair_depth == "Dark":
            return "Soft Autumn"
        else:
            return "Soft Summer"


# Pre-defined color palettes for each season
SEASON_PALETTES = {
    "Light Spring": {
        "poeticName": "Breeze",
        "seasonName": "Light Spring",
        "emoji": "🌸",
        "description": "Light, warm, and clear colors with a gentle brightness",
        "neutrals": [
            {"name": "Ivory", "hex": "#FFFFF0"},
            {"name": "Camel", "hex": "#C19A6B"},
            {"name": "Light Taupe", "hex": "#B38B6D"},
            {"name": "Warm Gray", "hex": "#A8A8A8"},
        ],
        "powerTones": [
            {"name": "Coral", "hex": "#FF7F50"},
            {"name": "Peach", "hex": "#FFE5B4"},
            {"name": "Aqua", "hex": "#7FFFD4"},
            {"name": "Golden Yellow", "hex": "#FFD700"},
            {"name": "Light Teal", "hex": "#20B2AA"},
            {"name": "Warm Pink", "hex": "#FFB6C1"},
        ],
        "accents": [
            {"name": "Light Coral", "hex": "#F08080"},
            {"name": "Turquoise", "hex": "#40E0D0"},
            {"name": "Apricot", "hex": "#FBCEB1"},
            {"name": "Periwinkle", "hex": "#CCCCFF"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Pure White", "hex": "#FFFFFF"},
            {"name": "Dark Purple", "hex": "#4B0082"},
        ],
    },

    "Warm Spring": {
        "poeticName": "Sunflower",
        "seasonName": "Warm Spring",
        "emoji": "🌻",
        "description": "Warm, clear, and vibrant colors with golden undertones",
        "neutrals": [
            {"name": "Cream", "hex": "#FFFDD0"},
            {"name": "Caramel", "hex": "#C68E17"},
            {"name": "Warm Beige", "hex": "#E8D0A9"},
            {"name": "Bronze", "hex": "#CD7F32"},
        ],
        "powerTones": [
            {"name": "Warm Red", "hex": "#DC143C"},
            {"name": "Orange", "hex": "#FF8C00"},
            {"name": "Golden", "hex": "#FFD700"},
            {"name": "Lime Green", "hex": "#9ACD32"},
            {"name": "Turquoise", "hex": "#40E0D0"},
            {"name": "Coral Pink", "hex": "#FF6F61"},
        ],
        "accents": [
            {"name": "Mango", "hex": "#FFA500"},
            {"name": "Yellow Green", "hex": "#ADFF2F"},
            {"name": "Salmon", "hex": "#FA8072"},
            {"name": "Light Coral", "hex": "#F08080"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Icy Blue", "hex": "#E0FFFF"},
            {"name": "Burgundy", "hex": "#800020"},
        ],
    },

    "Bright Spring": {
        "poeticName": "Spark",
        "seasonName": "Bright Spring",
        "emoji": "✨",
        "description": "Clear, warm, and vibrant with sunny brightness",
        "neutrals": [
            {"name": "Ivory", "hex": "#FFFFF0"},
            {"name": "Warm Gray", "hex": "#928E85"},
            {"name": "Camel", "hex": "#C19A6B"},
            {"name": "Navy", "hex": "#001F3F"},
        ],
        "powerTones": [
            {"name": "Bright Red", "hex": "#FF2400"},
            {"name": "Orange", "hex": "#FF8C00"},
            {"name": "Golden Yellow", "hex": "#FFD700"},
            {"name": "Kelly Green", "hex": "#4CBB17"},
            {"name": "Turquoise", "hex": "#40E0D0"},
            {"name": "Coral", "hex": "#FF7F50"},
        ],
        "accents": [
            {"name": "Hot Pink", "hex": "#FF69B4"},
            {"name": "Lime", "hex": "#32CD32"},
            {"name": "Electric Blue", "hex": "#7DF9FF"},
            {"name": "Tangerine", "hex": "#F28500"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Burgundy", "hex": "#800020"},
            {"name": "Olive", "hex": "#808000"},
        ],
    },

    "Light Summer": {
        "poeticName": "Cloud",
        "seasonName": "Light Summer",
        "emoji": "☁️",
        "description": "Light, cool, and soft with muted pastels",
        "neutrals": [
            {"name": "Soft White", "hex": "#F5F5F5"},
            {"name": "Rose Beige", "hex": "#E8C4C4"},
            {"name": "Cool Gray", "hex": "#A9A9A9"},
            {"name": "Cocoa", "hex": "#D2691E"},
        ],
        "powerTones": [
            {"name": "Dusty Rose", "hex": "#DCAE96"},
            {"name": "Lavender", "hex": "#E6E6FA"},
            {"name": "Sky Blue", "hex": "#87CEEB"},
            {"name": "Mint", "hex": "#98FF98"},
            {"name": "Mauve", "hex": "#E0B0FF"},
            {"name": "Powder Blue", "hex": "#B0E0E6"},
        ],
        "accents": [
            {"name": "Rose Pink", "hex": "#FF66CC"},
            {"name": "Periwinkle", "hex": "#CCCCFF"},
            {"name": "Seafoam", "hex": "#93E9BE"},
            {"name": "Lilac", "hex": "#C8A2C8"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Orange", "hex": "#FF8C00"},
            {"name": "Gold", "hex": "#FFD700"},
        ],
    },

    "Cool Summer": {
        "poeticName": "Stream",
        "seasonName": "Cool Summer",
        "emoji": "💧",
        "description": "Cool, soft, and muted with gentle elegance",
        "neutrals": [
            {"name": "Soft White", "hex": "#F8F8FF"},
            {"name": "Rose Brown", "hex": "#BC8F8F"},
            {"name": "Cool Taupe", "hex": "#8B7D6B"},
            {"name": "Charcoal", "hex": "#36454F"},
        ],
        "powerTones": [
            {"name": "Rose", "hex": "#FF007F"},
            {"name": "Lavender", "hex": "#B57EDC"},
            {"name": "Sky Blue", "hex": "#87CEEB"},
            {"name": "Sage", "hex": "#9DC183"},
            {"name": "Mauve", "hex": "#E0B0FF"},
            {"name": "Dusty Blue", "hex": "#6495ED"},
        ],
        "accents": [
            {"name": "Raspberry", "hex": "#E30B5C"},
            {"name": "Plum", "hex": "#DDA0DD"},
            {"name": "Teal", "hex": "#008080"},
            {"name": "Orchid", "hex": "#DA70D6"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Orange", "hex": "#FFA500"},
            {"name": "Bright Yellow", "hex": "#FFFF00"},
        ],
    },

    "Soft Summer": {
        "poeticName": "Mist",
        "seasonName": "Soft Summer",
        "emoji": "🌫️",
        "description": "Soft, cool-neutral, and muted tones",
        "neutrals": [
            {"name": "Greige", "hex": "#CCC5B9"},
            {"name": "Rose Taupe", "hex": "#905D5D"},
            {"name": "Pewter", "hex": "#96A8A1"},
            {"name": "Cocoa", "hex": "#8B7355"},
        ],
        "powerTones": [
            {"name": "Dusty Rose", "hex": "#C08081"},
            {"name": "Soft Teal", "hex": "#5F9EA0"},
            {"name": "Sage Green", "hex": "#9DC183"},
            {"name": "Lavender Gray", "hex": "#C4C3D0"},
            {"name": "Mauve", "hex": "#915F6D"},
            {"name": "Dusty Blue", "hex": "#7393B3"},
        ],
        "accents": [
            {"name": "Raspberry", "hex": "#B5485D"},
            {"name": "Plum", "hex": "#8E4585"},
            {"name": "Jade", "hex": "#00A86B"},
            {"name": "Mulberry", "hex": "#C54B8C"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Orange", "hex": "#FF8C00"},
            {"name": "Bright White", "hex": "#FFFFFF"},
        ],
    },

    "Soft Autumn": {
        "poeticName": "Dusk",
        "seasonName": "Soft Autumn",
        "emoji": "🌅",
        "description": "Soft, warm-neutral, and muted earthy tones",
        "neutrals": [
            {"name": "Warm Taupe", "hex": "#B38B6D"},
            {"name": "Khaki", "hex": "#C3B091"},
            {"name": "Olive", "hex": "#808000"},
            {"name": "Coffee", "hex": "#6F4E37"},
        ],
        "powerTones": [
            {"name": "Salmon", "hex": "#FA8072"},
            {"name": "Jade", "hex": "#00A86B"},
            {"name": "Teal", "hex": "#008080"},
            {"name": "Terracotta", "hex": "#E2725B"},
            {"name": "Moss", "hex": "#8A9A5B"},
            {"name": "Dusty Turquoise", "hex": "#5F9EA0"},
        ],
        "accents": [
            {"name": "Coral", "hex": "#FF7F50"},
            {"name": "Gold", "hex": "#CFB53B"},
            {"name": "Bronze", "hex": "#CD7F32"},
            {"name": "Olive Green", "hex": "#6B8E23"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Bright White", "hex": "#FFFFFF"},
            {"name": "Neon", "hex": "#FF10F0"},
        ],
    },

    "Warm Autumn": {
        "poeticName": "Harvest",
        "seasonName": "Warm Autumn",
        "emoji": "🍁",
        "description": "Rich, warm, and earthy with muted golden tones",
        "neutrals": [
            {"name": "Warm Taupe", "hex": "#967969"},
            {"name": "Olive", "hex": "#808000"},
            {"name": "Khaki", "hex": "#C3B091"},
            {"name": "Chocolate", "hex": "#7B3F00"},
        ],
        "powerTones": [
            {"name": "Rust", "hex": "#B7410E"},
            {"name": "Burnt Orange", "hex": "#CC5500"},
            {"name": "Mustard", "hex": "#FFDB58"},
            {"name": "Olive Green", "hex": "#556B2F"},
            {"name": "Teal", "hex": "#008080"},
            {"name": "Terracotta", "hex": "#E2725B"},
        ],
        "accents": [
            {"name": "Pumpkin", "hex": "#FF7518"},
            {"name": "Gold", "hex": "#FFD700"},
            {"name": "Moss Green", "hex": "#8A9A5B"},
            {"name": "Copper", "hex": "#B87333"},
        ],
        "avoid": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Icy Pink", "hex": "#FFB6C1"},
            {"name": "Bright Blue", "hex": "#0000FF"},
        ],
    },

    "Deep Autumn": {
        "poeticName": "Forest",
        "seasonName": "Deep Autumn",
        "emoji": "🌲",
        "description": "Deep, warm, and rich with strong earthy tones",
        "neutrals": [
            {"name": "Espresso", "hex": "#3D2B1F"},
            {"name": "Olive Drab", "hex": "#4A412A"},
            {"name": "Ivory", "hex": "#F5F5DC"},
            {"name": "Charcoal", "hex": "#2F4F4F"},
        ],
        "powerTones": [
            {"name": "Maroon", "hex": "#800000"},
            {"name": "Dark Gold", "hex": "#B8860B"},
            {"name": "Forest Green", "hex": "#556B2F"},
            {"name": "Cinnamon", "hex": "#D2691E"},
            {"name": "Deep Teal", "hex": "#004B49"},
            {"name": "Saddle Brown", "hex": "#8B4513"},
        ],
        "accents": [
            {"name": "Terracotta", "hex": "#E2725B"},
            {"name": "Chartreuse", "hex": "#9ACD32"},
            {"name": "Burnt Orange", "hex": "#FF8C00"},
            {"name": "Dark Slate", "hex": "#483D8B"},
        ],
        "avoid": [
            {"name": "Light Cyan", "hex": "#E0FFFF"},
            {"name": "Pink", "hex": "#FFB6C1"},
            {"name": "Bright Cyan", "hex": "#00FFFF"},
        ],
    },

    "Bright Winter": {
        "poeticName": "Diamond",
        "seasonName": "Bright Winter",
        "emoji": "💎",
        "description": "Clear, cool, and vibrant with high contrast",
        "neutrals": [
            {"name": "Pure White", "hex": "#FFFFFF"},
            {"name": "True Black", "hex": "#000000"},
            {"name": "Cool Gray", "hex": "#8C92AC"},
            {"name": "Navy", "hex": "#000080"},
        ],
        "powerTones": [
            {"name": "True Red", "hex": "#FF0000"},
            {"name": "Royal Blue", "hex": "#4169E1"},
            {"name": "Emerald", "hex": "#50C878"},
            {"name": "Hot Pink", "hex": "#FF69B4"},
            {"name": "Purple", "hex": "#800080"},
            {"name": "Bright Turquoise", "hex": "#00CED1"},
        ],
        "accents": [
            {"name": "Fuchsia", "hex": "#FF00FF"},
            {"name": "Electric Blue", "hex": "#7DF9FF"},
            {"name": "Lime", "hex": "#00FF00"},
            {"name": "Magenta", "hex": "#FF00FF"},
        ],
        "avoid": [
            {"name": "Orange", "hex": "#FFA500"},
            {"name": "Gold", "hex": "#FFD700"},
            {"name": "Beige", "hex": "#F5F5DC"},
        ],
    },

    "Cool Winter": {
        "poeticName": "Glacier",
        "seasonName": "Cool Winter",
        "emoji": "🧊",
        "description": "Deep, cool, and intense with strong presence",
        "neutrals": [
            {"name": "Pure White", "hex": "#FFFFFF"},
            {"name": "Black", "hex": "#000000"},
            {"name": "Charcoal", "hex": "#36454F"},
            {"name": "Navy", "hex": "#000080"},
        ],
        "powerTones": [
            {"name": "Royal Blue", "hex": "#4169E1"},
            {"name": "Emerald", "hex": "#50C878"},
            {"name": "Crimson", "hex": "#DC143C"},
            {"name": "Purple", "hex": "#800080"},
            {"name": "Magenta", "hex": "#FF00FF"},
            {"name": "Icy Blue", "hex": "#99CCFF"},
        ],
        "accents": [
            {"name": "Hot Pink", "hex": "#FF69B4"},
            {"name": "Electric Blue", "hex": "#7DF9FF"},
            {"name": "Violet", "hex": "#8F00FF"},
            {"name": "True Red", "hex": "#FF0000"},
        ],
        "avoid": [
            {"name": "Orange", "hex": "#FFA500"},
            {"name": "Gold", "hex": "#FFD700"},
            {"name": "Olive", "hex": "#808000"},
        ],
    },

    "Deep Winter": {
        "poeticName": "Midnight",
        "seasonName": "Deep Winter",
        "emoji": "🌙",
        "description": "Deep, cool, and dramatic with powerful richness",
        "neutrals": [
            {"name": "True White", "hex": "#FFFFFF"},
            {"name": "Black", "hex": "#000000"},
            {"name": "Charcoal", "hex": "#2F4F4F"},
            {"name": "Deep Navy", "hex": "#000080"},
        ],
        "powerTones": [
            {"name": "Deep Red", "hex": "#8B0000"},
            {"name": "Royal Purple", "hex": "#4B0082"},
            {"name": "Emerald", "hex": "#046307"},
            {"name": "Sapphire", "hex": "#0F52BA"},
            {"name": "Magenta", "hex": "#A020F0"},
            {"name": "Pine Green", "hex": "#01796F"},
        ],
        "accents": [
            {"name": "Hot Pink", "hex": "#FF1493"},
            {"name": "Electric Blue", "hex": "#0892D0"},
            {"name": "True Red", "hex": "#E0115F"},
            {"name": "Violet", "hex": "#8A2BE2"},
        ],
        "avoid": [
            {"name": "Orange", "hex": "#FF8C00"},
            {"name": "Peach", "hex": "#FFE5B4"},
            {"name": "Gold", "hex": "#FFD700"},
        ],
    },
}


def generate_color_recommendations(skin_tone_hex: str, hair_color_hex: str) -> Dict[str, Any]:
    """
    Generate complete color palette recommendations based on skin and hair color.

    Args:
        skin_tone_hex: Hex color code of skin tone (e.g., "#E8B999")
        hair_color_hex: Hex color code of hair color (e.g., "#1A1A1A")

    Returns:
        Dictionary with season, undertone, and color palettes
    """
    # Step 1: Detect undertone
    undertone = detect_undertone(skin_tone_hex)

    # Step 2: Calculate contrast
    contrast = calculate_contrast(skin_tone_hex, hair_color_hex)

    # Step 3: Determine season
    season = determine_season(skin_tone_hex, hair_color_hex, undertone, contrast)

    # Step 4: Get palette for the season
    palette = SEASON_PALETTES.get(season, SEASON_PALETTES["Deep Autumn"])

    return {
        "season": season,
        "poeticName": palette.get("poeticName", ""),
        "seasonName": palette.get("seasonName", season),
        "emoji": palette.get("emoji", ""),
        "undertone": undertone,
        "contrast": contrast,
        "description": palette["description"],
        "neutrals": palette["neutrals"],
        "powerTones": palette["powerTones"],
        "accents": palette["accents"],
        "avoid": palette["avoid"],
    }
