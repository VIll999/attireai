-- Migration: Update color_profiles table
-- Date: 2024-01-XX
-- Description: Add name and measurement_id fields, remove unique constraint on user_id

-- Step 1: Drop the unique constraint on user_id
ALTER TABLE color_profiles DROP INDEX user_id;

-- Step 2: Add new columns
ALTER TABLE color_profiles
ADD COLUMN name VARCHAR(50) NOT NULL DEFAULT 'Default Profile' AFTER user_id,
ADD COLUMN measurement_id CHAR(36) NULL AFTER name;

-- Step 3: Add foreign key constraint for measurement_id
ALTER TABLE color_profiles
ADD CONSTRAINT fk_color_profile_measurement
FOREIGN KEY (measurement_id) REFERENCES measurement_profiles(id) ON DELETE CASCADE;

-- Step 4: Create index on user_id for better query performance
CREATE INDEX idx_color_profiles_user_id ON color_profiles(user_id);

-- Step 5: Create index on measurement_id
CREATE INDEX idx_color_profiles_measurement_id ON color_profiles(measurement_id);
