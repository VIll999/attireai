-- Migration: Add occasion, weather, dress_code to style_preferences table
-- Version: 005
-- Date: 2026-02-25

USE railway;

-- Add occasion context columns to style_preferences
ALTER TABLE style_preferences
ADD COLUMN occasion VARCHAR(50) NULL AFTER user_id,
ADD COLUMN weather VARCHAR(50) NULL AFTER occasion,
ADD COLUMN dress_code VARCHAR(50) NULL AFTER weather;

-- Verify the change
DESCRIBE style_preferences;
