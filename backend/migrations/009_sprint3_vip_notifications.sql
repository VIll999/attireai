-- Sprint 3 migration: VIP trial tracking + notifications

-- Track whether free user has used their one-time VIP trial
ALTER TABLE users
ADD COLUMN vip_trial_used BOOLEAN NOT NULL DEFAULT FALSE;

-- Notifications table (Story #5 sale alerts, future general notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NULL,
    link VARCHAR(500) NULL,
    metadata JSON NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_unread (user_id, read_at, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
