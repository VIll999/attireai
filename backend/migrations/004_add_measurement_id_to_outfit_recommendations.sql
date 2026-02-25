-- Migration: Add measurement_id to outfit_recommendations table
-- Version: 004
-- Date: 2024-02-25

USE railway;

-- Add measurement_id column to outfit_recommendations
ALTER TABLE outfit_recommendations
ADD COLUMN measurement_id CHAR(36) NULL AFTER user_id,
ADD CONSTRAINT fk_outfit_recommendations_measurement
    FOREIGN KEY (measurement_id)
    REFERENCES measurement_profiles(id)
    ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_measurement_id ON outfit_recommendations(measurement_id);

-- Verify the change
DESCRIBE outfit_recommendations;
