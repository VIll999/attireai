-- Migration: Add stock_status column to recommendation_items table
-- Date: 2024-04-01
-- Description: Adds stock status tracking for inventory management

ALTER TABLE recommendation_items
ADD COLUMN stock_status ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN') DEFAULT 'UNKNOWN' AFTER outfit_index;
