-- Listing duration support.
-- Additive, non-destructive: adds an EXPIRED status value and an optional
-- expiresAt column. Existing listings, users, and all other data are untouched.
-- No columns or rows are dropped.

ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LISTING_EXPIRED';

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Listing_status_expiresAt_idx" ON "Listing"("status", "expiresAt");
