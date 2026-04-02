"""
Similarity calculation for outfit recommendations
Uses cosine similarity between feature vectors
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from app.utils.feature_extraction import ItemFeatureExtractor


class OutfitSimilarityCalculator:
    """Calculate similarity between outfits using feature vectors"""

    def __init__(self):
        self.extractor = ItemFeatureExtractor()

    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two vectors

        Formula: cos(θ) = (A · B) / (||A|| * ||B||)

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Similarity score in range [-1, 1], where:
            1.0 = identical
            0.0 = orthogonal (no relation)
            -1.0 = opposite
        """
        # Handle zero vectors
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        similarity = dot_product / (norm1 * norm2)

        return float(similarity)

    def calculate_similarity_to_liked(
        self,
        new_outfit: Dict,
        liked_outfits: List[Dict],
        use_weights: bool = True
    ) -> float:
        """
        Calculate average similarity to liked outfits

        Args:
            new_outfit: Outfit to evaluate
            liked_outfits: List of outfits the user liked
            use_weights: Whether to use time-based weighting (recent likes matter more)

        Returns:
            Average similarity score [0, 1]
        """
        if not liked_outfits:
            return 0.5  # Neutral score when no history

        # Extract new outfit vector
        new_vector = self.extractor.extract_outfit_features(new_outfit)

        # Calculate similarity to each liked outfit
        similarities = []
        weights = []

        for i, liked_outfit in enumerate(liked_outfits):
            liked_vector = self.extractor.extract_outfit_features(liked_outfit)
            sim = self.cosine_similarity(new_vector, liked_vector)

            # Normalize to [0, 1] range (from [-1, 1])
            sim = (sim + 1) / 2

            similarities.append(sim)

            # Time-based weight: more recent likes have higher weight
            if use_weights:
                weight = 1.0 / (i + 1)  # 1.0, 0.5, 0.33, 0.25, ...
            else:
                weight = 1.0

            weights.append(weight)

        # Calculate weighted average
        if use_weights:
            total_weight = sum(weights)
            weighted_sim = sum(s * w for s, w in zip(similarities, weights)) / total_weight
        else:
            weighted_sim = np.mean(similarities)

        return float(weighted_sim)

    def calculate_similarity_to_disliked(
        self,
        new_outfit: Dict,
        disliked_outfits: List[Dict]
    ) -> float:
        """
        Calculate average similarity to disliked outfits

        Args:
            new_outfit: Outfit to evaluate
            disliked_outfits: List of outfits the user disliked

        Returns:
            Average similarity score [0, 1]
        """
        if not disliked_outfits:
            return 0.0  # No penalty when no dislikes

        new_vector = self.extractor.extract_outfit_features(new_outfit)

        similarities = []
        for disliked_outfit in disliked_outfits:
            disliked_vector = self.extractor.extract_outfit_features(disliked_outfit)
            sim = self.cosine_similarity(new_vector, disliked_vector)

            # Normalize to [0, 1]
            sim = (sim + 1) / 2
            similarities.append(sim)

        return float(np.mean(similarities))

    def calculate_preference_score(
        self,
        new_outfit: Dict,
        liked_outfits: List[Dict],
        disliked_outfits: List[Dict],
        dislike_penalty: float = 0.5
    ) -> Tuple[float, Dict]:
        """
        Calculate overall preference score for an outfit

        Formula:
        score = similarity_to_liked - (dislike_penalty * similarity_to_disliked)

        Args:
            new_outfit: Outfit to evaluate
            liked_outfits: User's liked outfits
            disliked_outfits: User's disliked outfits
            dislike_penalty: How much to penalize similarity to dislikes (0-1)

        Returns:
            Tuple of (score, debug_info)
            score: Preference score (higher is better)
            debug_info: Dict with breakdown for debugging
        """
        # Calculate component scores
        sim_to_liked = self.calculate_similarity_to_liked(new_outfit, liked_outfits)
        sim_to_disliked = self.calculate_similarity_to_disliked(new_outfit, disliked_outfits)

        # Combine scores
        preference_score = sim_to_liked - (dislike_penalty * sim_to_disliked)

        # Debug information
        debug_info = {
            'similarity_to_liked': sim_to_liked,
            'similarity_to_disliked': sim_to_disliked,
            'preference_score': preference_score,
            'liked_count': len(liked_outfits),
            'disliked_count': len(disliked_outfits)
        }

        return preference_score, debug_info

    def rank_outfits(
        self,
        candidate_outfits: List[Dict],
        liked_outfits: List[Dict],
        disliked_outfits: List[Dict]
    ) -> List[Tuple[Dict, float, Dict]]:
        """
        Rank a list of outfits by preference score

        Args:
            candidate_outfits: Outfits to rank
            liked_outfits: User's liked outfits
            disliked_outfits: User's disliked outfits

        Returns:
            List of (outfit, score, debug_info) tuples, sorted by score descending
        """
        ranked = []

        for outfit in candidate_outfits:
            score, debug_info = self.calculate_preference_score(
                outfit,
                liked_outfits,
                disliked_outfits
            )
            ranked.append((outfit, score, debug_info))

        # Sort by score descending
        ranked.sort(key=lambda x: x[1], reverse=True)

        return ranked

    def explain_similarity(
        self,
        outfit1: Dict,
        outfit2: Dict,
        top_k: int = 5
    ) -> Dict:
        """
        Explain why two outfits are similar or different

        Args:
            outfit1: First outfit
            outfit2: Second outfit
            top_k: Number of top features to show

        Returns:
            Dict with explanation details
        """
        vec1 = self.extractor.extract_outfit_features(outfit1)
        vec2 = self.extractor.extract_outfit_features(outfit2)

        similarity = self.cosine_similarity(vec1, vec2)

        # Find common features (both non-zero)
        common_features = []
        for feature_name, idx in self.extractor.feature_map.items():
            if vec1[idx] > 0 and vec2[idx] > 0:
                avg_value = (vec1[idx] + vec2[idx]) / 2
                common_features.append((feature_name, avg_value))

        common_features.sort(key=lambda x: x[1], reverse=True)

        # Find different features (one has, other doesn't)
        different_features = []
        for feature_name, idx in self.extractor.feature_map.items():
            if (vec1[idx] > 0) != (vec2[idx] > 0):  # XOR
                value = max(vec1[idx], vec2[idx])
                owner = "outfit1" if vec1[idx] > 0 else "outfit2"
                different_features.append((feature_name, value, owner))

        different_features.sort(key=lambda x: x[1], reverse=True)

        return {
            'similarity': similarity,
            'normalized_similarity': (similarity + 1) / 2,
            'common_features': common_features[:top_k],
            'different_features': different_features[:top_k]
        }
