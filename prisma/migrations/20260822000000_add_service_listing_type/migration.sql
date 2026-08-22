-- Add SERVICE as a new ListingType.
-- This is an additive, non-destructive change: existing listings, users, and
-- all other data are left untouched. No columns or rows are dropped.
ALTER TYPE "ListingType" ADD VALUE IF NOT EXISTS 'SERVICE';
