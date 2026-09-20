-- ============================================================
-- Migration: Add profile_image column to student table
-- EAS Exam Application System
-- ============================================================

ALTER TABLE student 
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) DEFAULT 'v1789934033/download.jpg';

-- Backfill any existing students with NULL profile_image
UPDATE student 
SET profile_image = 'v1789934033/download.jpg' 
WHERE profile_image IS NULL;
