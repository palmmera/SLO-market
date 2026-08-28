-- AlterTable
ALTER TABLE "Order" ADD COLUMN "rentalStartDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "rentalEndDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "rentalDays" INTEGER;
ALTER TABLE "Order" ADD COLUMN "dailyRateCents" INTEGER;
