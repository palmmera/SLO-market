-- Sellers can mark a garage sale live. Null means not live.
ALTER TABLE "Collection" ADD COLUMN "liveAt" TIMESTAMP(3);
