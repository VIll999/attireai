-- Migration: Update color_profiles table (Fixed)
-- Date: 2024-02-24
-- Description: Add name and measurement_id fields, remove unique constraint on user_id

-- Step 1: Drop the foreign key constraint first
ALTER TABLE color_profiles DROP FOREIGN KEY color_profiles_ibfk_1;

-- Step 2: Drop the unique constraint on user_id
ALTER TABLE color_profiles DROP INDEX user_id;

-- Step 3: Add new columns
ALTER TABLE color_profiles
ADD COLUMN name VARCHAR(50) NOT NULL DEFAULT 'Default Profile' AFTER user_id,
ADD COLUMN measurement_id CHAR(36) NULL AFTER name;

-- Step 4: Re-create foreign key for user_id (without unique constraint)
ALTER TABLE color_profiles
ADD CONSTRAINT fk_color_profile_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 5: Add foreign key constraint for measurement_id
ALTER TABLE color_profiles
ADD CONSTRAINT fk_color_profile_measurement
FOREIGN KEY (measurement_id) REFERENCES measurement_profiles(id) ON DELETE CASCADE;

-- Step 6: Create index on user_id for better query performance
CREATE INDEX idx_color_profiles_user_id ON color_profiles(user_id);

-- Step 7: Create index on measurement_id
CREATE INDEX idx_color_profiles_measurement_id ON color_profiles(measurement_id);
