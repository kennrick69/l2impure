CREATE TABLE "wallet_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "coins" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "mp_payment_id" VARCHAR(64),
    "mp_preference_id" VARCHAR(64),
    "type" VARCHAR(20) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wallet_transactions_user_id_idx" ON "wallet_transactions"("user_id");
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");
CREATE INDEX "wallet_transactions_mp_payment_id_idx" ON "wallet_transactions"("mp_payment_id");
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions"("created_at");

ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
