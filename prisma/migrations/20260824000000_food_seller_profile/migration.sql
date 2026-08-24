-- CreateEnum
CREATE TYPE "FoodSellerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FoodProductionSource" AS ENUM ('GROW_MYSELF', 'HOME_PRODUCTION', 'COMMERCIAL_FACILITY', 'RESELL', 'OTHER');

-- CreateEnum
CREATE TYPE "PermitRequiredAnswer" AS ENUM ('YES', 'NO', 'UNSURE');

-- CreateEnum
CREATE TYPE "ProduceProductType" AS ENUM ('FRESH_PRODUCE', 'HONEY', 'JAM_JELLY', 'PICKLED_PRESERVED', 'OTHER');

-- CreateTable
CREATE TABLE "FoodSellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT,
    "cityId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "productTypes" TEXT[],
    "otherProductDesc" TEXT,
    "productionSource" "FoodProductionSource" NOT NULL,
    "productionSourceOther" TEXT,
    "permitRequired" "PermitRequiredAnswer" NOT NULL,
    "permitType" TEXT,
    "permitNumber" TEXT,
    "permitAgency" TEXT,
    "permitExpiresAt" TIMESTAMP(3),
    "permitDocumentUrl" TEXT,
    "certCompliance" BOOLEAN NOT NULL,
    "certCottageFood" BOOLEAN NOT NULL,
    "certNoProhibited" BOOLEAN NOT NULL,
    "certLabeling" BOOLEAN NOT NULL,
    "certRemoveNonCompliant" BOOLEAN NOT NULL,
    "certOwner" BOOLEAN NOT NULL,
    "certMarketplaceDisclaimer" BOOLEAN NOT NULL,
    "certTerms" BOOLEAN NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT '2026-08-24',
    "status" "FoodSellerStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodSellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodSellerProfile_userId_key" ON "FoodSellerProfile"("userId");

-- CreateIndex
CREATE INDEX "FoodSellerProfile_cityId_idx" ON "FoodSellerProfile"("cityId");

-- CreateIndex
CREATE INDEX "FoodSellerProfile_status_idx" ON "FoodSellerProfile"("status");

-- AddForeignKey
ALTER TABLE "FoodSellerProfile" ADD CONSTRAINT "FoodSellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodSellerProfile" ADD CONSTRAINT "FoodSellerProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
