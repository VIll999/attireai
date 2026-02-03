-- AttireAI Database Schema
-- Version: 1.0
-- Run this in MySQL Workbench connected to Railway

-- Use the railway database
USE railway;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    profile_picture_url VARCHAR(500),
    subscription_tier ENUM('FREE', 'VIP') DEFAULT 'FREE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_firebase_uid (firebase_uid),
    INDEX idx_email (email)
);

-- Measurement profiles (users can have multiple)
CREATE TABLE IF NOT EXISTS measurement_profiles (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    chest DECIMAL(5,2),
    waist DECIMAL(5,2),
    hip DECIMAL(5,2),
    inseam DECIMAL(5,2),
    shoulder_width DECIMAL(5,2),
    arm_length DECIMAL(5,2),
    unit ENUM('CM', 'IN') DEFAULT 'CM',
    is_primary BOOLEAN DEFAULT FALSE,
    source ENUM('MANUAL', 'CAMERA') DEFAULT 'MANUAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Color profiles
CREATE TABLE IF NOT EXISTS color_profiles (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) UNIQUE NOT NULL,
    skin_tone VARCHAR(50),
    skin_tone_hex VARCHAR(7),
    hair_color VARCHAR(50),
    hair_color_hex VARCHAR(7),
    recommended_palette JSON,
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Style preferences
CREATE TABLE IF NOT EXISTS style_preferences (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) UNIQUE NOT NULL,
    preferred_styles JSON,
    avoided_styles JSON,
    price_range ENUM('BUDGET', 'MID_RANGE', 'LUXURY') DEFAULT 'MID_RANGE',
    preferred_brands JSON,
    excluded_brands JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Outfit recommendations
CREATE TABLE IF NOT EXISTS outfit_recommendations (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    occasion VARCHAR(100),
    weather VARCHAR(50),
    dress_code VARCHAR(50),
    total_price DECIMAL(10,2),
    reasoning TEXT,
    user_rating ENUM('LIKE', 'DISLIKE', 'NONE') DEFAULT 'NONE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
);

-- Product items in recommendations
CREATE TABLE IF NOT EXISTS recommendation_items (
    id CHAR(36) PRIMARY KEY,
    recommendation_id CHAR(36) NOT NULL,
    external_product_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    category ENUM('TOP', 'BOTTOM', 'SHOES', 'ACCESSORY', 'OUTERWEAR'),
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    image_url VARCHAR(500),
    purchase_url VARCHAR(500),
    recommended_size VARCHAR(20),
    colors JSON,
    material VARCHAR(100),
    FOREIGN KEY (recommendation_id) REFERENCES outfit_recommendations(id) ON DELETE CASCADE,
    INDEX idx_recommendation_id (recommendation_id)
);

-- Saved outfits / collections
CREATE TABLE IF NOT EXISTS saved_outfits (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    recommendation_id CHAR(36) NOT NULL,
    collection_name VARCHAR(50) DEFAULT 'Favorites',
    is_purchased BOOLEAN DEFAULT FALSE,
    try_on_image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recommendation_id) REFERENCES outfit_recommendations(id) ON DELETE CASCADE,
    INDEX idx_user_collection (user_id, collection_name)
);

-- Virtual try-on requests (VIP only)
CREATE TABLE IF NOT EXISTS virtual_try_ons (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    user_photo_url VARCHAR(500) NOT NULL,
    outfit_id CHAR(36) NOT NULL,
    result_image_url VARCHAR(500),
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (outfit_id) REFERENCES outfit_recommendations(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status)
);

-- VIP subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    status ENUM('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING') DEFAULT 'TRIALING',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Show created tables
SHOW TABLES;
