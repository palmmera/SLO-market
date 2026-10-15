-- Cash vs card on listings, plus a $10/month Seller Plan for extra cash inventory.
-- Existing listings and garage sales stay CARD so current checkout is unchanged.

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BOTH');
CREATE TYPE "SellerPlanStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

ALTER TABLE "Listing" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD';
ALTER TABLE "Collection" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD';

CREATE TABLE "SellerSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "SellerPlanStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SellerSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerSubscription_userId_key" ON "SellerSubscription"("userId");
CREATE UNIQUE INDEX "SellerSubscription_stripeCustomerId_key" ON "SellerSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX "SellerSubscription_stripeSubscriptionId_key" ON "SellerSubscription"("stripeSubscriptionId");

ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
