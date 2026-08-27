-- AlterEnum
ALTER TYPE "ListingType" ADD VALUE 'RENTAL';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "isRental" BOOLEAN NOT NULL DEFAULT false;
