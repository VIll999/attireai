"""
Recommendation learning service
Learns from user ratings and improves recommendations over time
"""

from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from decimal import Decimal

from app.db.models import User, OutfitRecommendation, RecommendationItem
from app.utils.similarity import OutfitSimilarityCalculator


class RecommendationLearningService:
    """Service for learning from user ratings and personalizing recommendations"""

    def __init__(self):
        self.similarity_calculator = OutfitSimilarityCalculator()

    def _outfit_to_dict(self, recommendation: OutfitRecommendation) -> Dict:
        """
        Convert database OutfitRecommendation to dict format for similarity calculation

        Args:
            recommendation: OutfitRecommendation database model

        Returns:
            Dict representation of outfit
        """
        return {
            'id': recommendation.id,
            'items': [
                {
                    'name': item.name or 'Unknown Item',
                    'category': item.category,
                    'brand': item.brand,
                    'price': float(item.price) if item.price else 0,
                    'currency': item.currency,
                    'image_url': item.image_url,
                    'recommended_size': item.recommended_size
                }
                for item in recommendation.items
            ],
            'occasion': recommendation.occasion,
            'weather': recommendation.weather,
            'reasoning': recommendation.reasoning
        }

    def get_user_rating_history(self, db: Session, user_id: str) -> Dict:
        """
        Get user's rating history

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dict with 'liked', 'disliked' outfit lists and 'count'
        """
        # Import here to avoid circular dependency
        from app.db.models import OutfitRating

        # Get all ratings for user, ordered by most recent first
        ratings = (
            db.query(OutfitRating)
            .filter(OutfitRating.user_id == user_id)
            .order_by(desc(OutfitRating.created_at))
            .all()
        )

        liked_outfits = []
        disliked_outfits = []

        for rating in ratings:
            # Load the full recommendation with items
            recommendation = (
                db.query(OutfitRecommendation)
                .filter(OutfitRecommendation.id == rating.recommendation_id)
                .first()
            )

            if not recommendation:
                continue

            outfit_dict = self._outfit_to_dict(recommendation)

            if rating.rating == 'LIKE':
                liked_outfits.append(outfit_dict)
            elif rating.rating == 'DISLIKE':
                disliked_outfits.append(outfit_dict)

        return {
            'liked': liked_outfits,
            'disliked': disliked_outfits,
            'count': len(ratings)
        }

    def rank_recommendations(
        self,
        db: Session,
        user_id: str,
        candidate_outfits: List[OutfitRecommendation],
        return_debug_info: bool = False
    ) -> List[OutfitRecommendation]:
        """
        Re-rank recommendations based on user's rating history

        Args:
            db: Database session
            user_id: User ID
            candidate_outfits: List of OutfitRecommendation objects to rank
            return_debug_info: Whether to attach debug info to recommendations

        Returns:
            Re-ranked list of OutfitRecommendation objects
        """
        # Get user's rating history
        history = self.get_user_rating_history(db, user_id)

        # If no rating history, return as-is
        if history['count'] == 0:
            for outfit in candidate_outfits:
                outfit.learning_score = None
                outfit.learning_debug = None
            return candidate_outfits

        # Convert candidates to dict format
        candidate_dicts = [self._outfit_to_dict(outfit) for outfit in candidate_outfits]

        # Calculate preference scores for each candidate
        ranked_with_scores = self.similarity_calculator.rank_outfits(
            candidate_dicts,
            history['liked'],
            history['disliked']
        )

        # Create a map of outfit_id -> (score, debug_info)
        score_map = {
            outfit_dict['id']: (score, debug_info)
            for outfit_dict, score, debug_info in ranked_with_scores
        }

        # Attach scores to original OutfitRecommendation objects
        for outfit in candidate_outfits:
            if outfit.id in score_map:
                score, debug_info = score_map[outfit.id]
                outfit.learning_score = score

                if return_debug_info:
                    outfit.learning_debug = debug_info
            else:
                outfit.learning_score = 0.0
                outfit.learning_debug = None

        # Sort by learning score (descending)
        candidate_outfits.sort(
            key=lambda x: x.learning_score if x.learning_score is not None else 0.0,
            reverse=True
        )

        return candidate_outfits

    def get_learning_stats(self, db: Session, user_id: str) -> Dict:
        """
        Get learning statistics for a user

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dict with learning statistics
        """
        from app.db.models import OutfitRating

        # Count ratings
        total_ratings = db.query(OutfitRating).filter(
            OutfitRating.user_id == user_id
        ).count()

        likes = db.query(OutfitRating).filter(
            OutfitRating.user_id == user_id,
            OutfitRating.rating == 'LIKE'
        ).count()

        dislikes = db.query(OutfitRating).filter(
            OutfitRating.user_id == user_id,
            OutfitRating.rating == 'DISLIKE'
        ).count()

        # Determine if learning is active
        learning_active = total_ratings >= 3  # Need at least 3 ratings for meaningful learning

        return {
            'total_ratings': total_ratings,
            'likes': likes,
            'dislikes': dislikes,
            'learning_active': learning_active,
            'min_ratings_needed': 3
        }

    def explain_recommendation(
        self,
        db: Session,
        user_id: str,
        recommendation: OutfitRecommendation,
        top_k: int = 3
    ) -> Optional[Dict]:
        """
        Explain why a recommendation was suggested

        Args:
            db: Database session
            user_id: User ID
            recommendation: The recommendation to explain
            top_k: Number of top similar outfits to compare

        Returns:
            Explanation dict or None if no history
        """
        history = self.get_user_rating_history(db, user_id)

        if history['count'] == 0:
            return None

        outfit_dict = self._outfit_to_dict(recommendation)

        # Find most similar liked outfit
        if history['liked']:
            most_similar_liked = None
            max_similarity = -1

            for liked_outfit in history['liked'][:top_k]:  # Check top K liked outfits
                explanation = self.similarity_calculator.explain_similarity(
                    outfit_dict,
                    liked_outfit
                )

                if explanation['normalized_similarity'] > max_similarity:
                    max_similarity = explanation['normalized_similarity']
                    most_similar_liked = {
                        'outfit': liked_outfit,
                        'explanation': explanation
                    }

            return {
                'type': 'similar_to_liked',
                'similarity': max_similarity,
                'reference_outfit': most_similar_liked['outfit']['id'] if most_similar_liked else None,
                'common_features': most_similar_liked['explanation']['common_features'] if most_similar_liked else [],
                'confidence': 'high' if max_similarity > 0.7 else 'medium' if max_similarity > 0.5 else 'low'
            }

        return None
