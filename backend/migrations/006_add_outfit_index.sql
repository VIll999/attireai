-- Add outfit_index column to recommendation_items for grouping items into distinct outfits
ALTER TABLE recommendation_items ADD COLUMN outfit_index INT NULL;
