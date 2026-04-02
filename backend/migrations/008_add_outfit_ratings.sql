-- Add outfit ratings table for learning system
-- User Story #8: Learning from rating history

CREATE TABLE IF NOT EXISTS outfit_ratings (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    recommendation_id CHAR(36) NOT NULL,
    rating ENUM('LIKE', 'DISLIKE') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recommendation_id) REFERENCES outfit_recommendations(id) ON DELETE CASCADE,

    -- Ensure one rating per user per outfit
    UNIQUE KEY unique_user_outfit_rating (user_id, recommendation_id),

    INDEX idx_user_ratings (user_id, created_at),
    INDEX idx_recommendation_ratings (recommendation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Add feature vector cache to outfit_recommendations for performance
ALTER TABLE outfit_recommendations
ADD COLUMN feature_vector JSON DEFAULT NULL COMMENT 'Cached feature vector for similarity calculation';
