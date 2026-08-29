-- AlterTable
ALTER TABLE "CollectionImage" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "CollectionImage" ADD COLUMN "durationSec" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ListingHotspot" ADD COLUMN "atSeconds" DOUBLE PRECISION;
