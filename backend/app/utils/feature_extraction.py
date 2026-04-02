"""
Feature extraction for outfit similarity learning
Converts outfits and items into numerical vectors for similarity calculation
"""

import re
import numpy as np
from typing import Dict, List, Optional
from collections import defaultdict


class ItemFeatureExtractor:
    """Extract feature vectors from items and outfits"""

    # Feature vocabularies (predefined)
    CATEGORIES = [
        'blazer', 'jacket', 'coat', 'shirt', 'tee', 't-shirt', 'top', 'blouse',
        'sweater', 'cardigan', 'hoodie', 'sweatshirt',
        'jeans', 'pants', 'trousers', 'chinos', 'shorts', 'skirt', 'dress',
        'shoes', 'sneakers', 'boots', 'loafers', 'heels', 'sandals',
        'bag', 'backpack', 'purse', 'belt', 'hat', 'cap', 'scarf', 'watch'
    ]

    COLORS = [
        'black', 'white', 'blue', 'navy', 'gray', 'grey', 'beige', 'tan', 'khaki',
        'brown', 'red', 'burgundy', 'maroon', 'pink', 'rose', 'blush',
        'green', 'olive', 'yellow', 'gold', 'purple', 'lavender', 'orange',
        'cream', 'ivory', 'charcoal', 'denim'
    ]

    STYLES = [
        'formal', 'casual', 'business', 'smart', 'dressy',
        'sporty', 'athletic', 'active', 'workout',
        'elegant', 'sophisticated', 'chic',
        'vintage', 'retro', 'classic', 'timeless',
        'bohemian', 'boho', 'hippie',
        'minimalist', 'minimal', 'simple',
        'streetwear', 'urban', 'edgy',
        'preppy', 'collegiate',
        'romantic', 'feminine', 'masculine'
    ]

    MATERIALS = [
        'cotton', 'wool', 'leather', 'denim', 'silk', 'satin', 'linen',
        'polyester', 'nylon', 'spandex', 'cashmere', 'velvet', 'suede',
        'canvas', 'jersey', 'knit', 'fleece'
    ]

    PATTERNS = [
        'solid', 'plain', 'striped', 'stripe', 'checkered', 'checked', 'plaid',
        'floral', 'flower', 'polka-dot', 'dotted', 'print', 'printed',
        'graphic', 'logo', 'paisley', 'geometric', 'abstract'
    ]

    FITS = [
        'slim', 'skinny', 'fitted', 'tailored',
        'regular', 'classic-fit',
        'relaxed', 'loose', 'oversized', 'baggy',
        'cropped', 'long', 'short', 'midi', 'maxi'
    ]

    def __init__(self):
        """Initialize feature map with indices"""
        self.feature_map = {}
        idx = 0

        # Category features
        for category in self.CATEGORIES:
            self.feature_map[f'cat_{category}'] = idx
            idx += 1

        # Color features
        for color in self.COLORS:
            self.feature_map[f'col_{color}'] = idx
            idx += 1

        # Style features
        for style in self.STYLES:
            self.feature_map[f'sty_{style}'] = idx
            idx += 1

        # Material features
        for material in self.MATERIALS:
            self.feature_map[f'mat_{material}'] = idx
            idx += 1

        # Pattern features
        for pattern in self.PATTERNS:
            self.feature_map[f'pat_{pattern}'] = idx
            idx += 1

        # Fit features
        for fit in self.FITS:
            self.feature_map[f'fit_{fit}'] = idx
            idx += 1

        # Price range features
        self.feature_map['price_budget'] = idx      # < $100
        self.feature_map['price_mid'] = idx + 1      # $100-300
        self.feature_map['price_luxury'] = idx + 2   # > $300

        self.vector_size = idx + 3

    def _normalize_text(self, text: str) -> str:
        """Normalize text for feature extraction"""
        if not text:
            return ""
        # Convert to lowercase and remove special chars except hyphens
        text = text.lower()
        text = re.sub(r'[^\w\s-]', ' ', text)
        return text

    def extract_features(self, item: Dict) -> np.ndarray:
        """
        Extract feature vector from a single item

        Args:
            item: Dict with keys 'name', 'category', 'brand', 'price', etc.

        Returns:
            Feature vector as numpy array
        """
        vector = np.zeros(self.vector_size, dtype=np.float32)

        # Combine name and category for text analysis
        name = self._normalize_text(item.get('name', ''))
        category = self._normalize_text(item.get('category', ''))
        text = f"{name} {category}"

        # Extract category features
        for cat in self.CATEGORIES:
            if cat in text:
                vector[self.feature_map[f'cat_{cat}']] = 1.0

        # Extract color features
        for color in self.COLORS:
            if color in text:
                vector[self.feature_map[f'col_{color}']] = 1.0

        # Extract style features
        for style in self.STYLES:
            if style in text:
                vector[self.feature_map[f'sty_{style}']] = 1.0

        # Extract material features
        for material in self.MATERIALS:
            if material in text:
                vector[self.feature_map[f'mat_{material}']] = 1.0

        # Extract pattern features
        for pattern in self.PATTERNS:
            if pattern in text:
                vector[self.feature_map[f'pat_{pattern}']] = 1.0

        # Extract fit features
        for fit in self.FITS:
            if fit in text:
                vector[self.feature_map[f'fit_{fit}']] = 1.0

        # Extract price features
        price = float(item.get('price', 0)) if item.get('price') else 0
        if price > 0:
            if price < 100:
                vector[self.feature_map['price_budget']] = 1.0
            elif price < 300:
                vector[self.feature_map['price_mid']] = 1.0
            else:
                vector[self.feature_map['price_luxury']] = 1.0

        return vector

    def extract_outfit_features(self, outfit: Dict) -> np.ndarray:
        """
        Extract feature vector from an outfit (collection of items)

        Args:
            outfit: Dict with 'items' list

        Returns:
            Aggregated feature vector
        """
        items = outfit.get('items', [])

        if not items:
            return np.zeros(self.vector_size, dtype=np.float32)

        # Extract features for each item
        item_vectors = [self.extract_features(item) for item in items]

        # Aggregate: sum and normalize by number of items
        # This gives us the "average" features of the outfit
        outfit_vector = np.sum(item_vectors, axis=0)

        # Optional: normalize to [0, 1] range
        # outfit_vector = outfit_vector / len(items)

        return outfit_vector

    def get_feature_names(self) -> List[str]:
        """Get all feature names (for debugging/explanation)"""
        return sorted(self.feature_map.keys(), key=lambda x: self.feature_map[x])

    def explain_vector(self, vector: np.ndarray, top_k: int = 10) -> List[tuple]:
        """
        Explain which features are most prominent in a vector

        Args:
            vector: Feature vector
            top_k: Number of top features to return

        Returns:
            List of (feature_name, value) tuples
        """
        feature_values = []
        for feature_name, idx in self.feature_map.items():
            if vector[idx] > 0:
                feature_values.append((feature_name, vector[idx]))

        # Sort by value descending
        feature_values.sort(key=lambda x: x[1], reverse=True)

        return feature_values[:top_k]
