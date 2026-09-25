-- DEVPATH PostgreSQL Database Schema
-- Compatible with Vercel Postgres (Neon), Supabase, Railway Postgres, and local PostgreSQL

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255) DEFAULT NULL,
    verification_code VARCHAR(10) DEFAULT NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_expires TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Track Progress Table
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id VARCHAR(50) NOT NULL,
    phase_number INT NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_track_phase UNIQUE (user_id, track_id, phase_number)
);

-- 3. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(200) DEFAULT 'General Inquiry',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin user (password: admin123, pre-verified)
INSERT INTO users (full_name, email, password_hash, role, is_verified)
VALUES (
    'Admin Mohamed',
    'sci.mohamedabdelaziz01652@alexu.edu.eg',
    '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR5.qR8f3Hk2kRHz85e9r2dZy2K/O',
    'admin',
    TRUE
)
ON CONFLICT (email) DO NOTHING;
