-- DEVPATH Database Schema
CREATE DATABASE IF NOT EXISTS devpath_db;
USE devpath_db;

-- 1. Users Table (with email verification and reset token)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255) DEFAULT NULL,
    verification_code VARCHAR(10) DEFAULT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_expires TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. User Track Progress Table
CREATE TABLE IF NOT EXISTS user_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    track_id VARCHAR(50) NOT NULL,
    phase_number INT NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_track_phase (user_id, track_id, phase_number),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(200) DEFAULT 'General Inquiry',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin user (password: admin123, pre-verified)
INSERT IGNORE INTO users (id, full_name, email, password_hash, role, is_verified)
VALUES (1, 'Admin Mohamed', 'sci.mohamedabdelaziz01652@alexu.edu.eg', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR5.qR8f3Hk2kRHz85e9r2dZy2K/O', 'admin', TRUE);
