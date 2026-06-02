-- CreateTable
CREATE TABLE "vip_gift_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimMonth" TEXT NOT NULL,
    "tier" "PremiumTier" NOT NULL,
    "grantedGifts" JSONB NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vip_gift_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vip_gift_claims_userId_claimMonth_tier_key" ON "vip_gift_claims"("userId", "claimMonth", "tier");

-- CreateIndex
CREATE INDEX "vip_gift_claims_userId_claimMonth_idx" ON "vip_gift_claims"("userId", "claimMonth");

-- CreateIndex
CREATE INDEX "vip_gift_claims_claimedAt_idx" ON "vip_gift_claims"("claimedAt");

-- AddForeignKey
ALTER TABLE "vip_gift_claims" ADD CONSTRAINT "vip_gift_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
