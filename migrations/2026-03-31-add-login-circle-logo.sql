-- Migration: add login_circle_logo fields to system_config and public_config
-- Run this in Supabase SQL editor or via psql connected to your project.

BEGIN;

-- Add login circle URL and path to system_config
ALTER TABLE IF EXISTS system_config
  ADD COLUMN IF NOT EXISTS login_circle_logo_url text;

ALTER TABLE IF EXISTS system_config
  ADD COLUMN IF NOT EXISTS login_circle_logo_path text;

-- Add corresponding column(s) to public_config so syncPublicSetupConfig can persist it
ALTER TABLE IF EXISTS public_config
  ADD COLUMN IF NOT EXISTS login_circle_logo_url text;

ALTER TABLE IF EXISTS public_config
  ADD COLUMN IF NOT EXISTS login_circle_logo_path text;

COMMIT;
