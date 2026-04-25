-- Add coins + referral_code to users
ALTER TABLE "users" ADD COLUMN "coins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "referral_code" VARCHAR(16);

-- Backfill referral_code para users existentes (random hex 10 chars)
UPDATE "users"
SET "referral_code" = UPPER(SUBSTRING(MD5(RANDOM()::text || id::text || NOW()::text), 1, 10))
WHERE "referral_code" IS NULL;

-- Em seguida, NOT NULL + UNIQUE
ALTER TABLE "users" ALTER COLUMN "referral_code" SET NOT NULL;
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- Enum ReferralStatus
CREATE TYPE "referral_status" AS ENUM ('pending', 'converted');

-- Tabela referrals
CREATE TABLE "referrals" (
    "id" SERIAL NOT NULL,
    "referrer_id" INTEGER NOT NULL,
    "referred_id" INTEGER NOT NULL,
    "status" "referral_status" NOT NULL DEFAULT 'pending',
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referrals_referred_id_key" ON "referrals"("referred_id");
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey"
  FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey"
  FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
