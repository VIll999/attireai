-- Migration: Remove name column from color_profiles
-- Date: 2024-02-24
-- Description: Remove redundant name field, only keep measurement_id

-- Remove the name column
ALTER TABLE color_profiles DROP COLUMN name;
