-- Add admin role to the enum (must be in separate transaction)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';