-- Migration: Add price tracking to saved_outfits
-- Purpose: Track original total price at save time to detect price drops
-- Date: 2026-04-02

-- Add original_total_price to saved_outfits table
ALTER TABLE saved_outfits
ADD COLUMN original_total_price DECIMAL(10, 2) DEFAULT NULL AFTER is_purchased;

-- Backfill: Set original_total_price for existing saved outfits
-- Calculate from current recommendation items prices
UPDATE saved_outfits so
SET original_total_price = (
    SELECT SUM(ri.price)
    FROM recommendation_items ri
    WHERE ri.recommendation_id = so.recommendation_id
);
