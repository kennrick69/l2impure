-- Enum role
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- Adiciona colunas em users
ALTER TABLE "users" ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'user';
ALTER TABLE "users" ADD COLUMN "banned_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "banned_reason" VARCHAR(255);

-- Settings (key/value JSON pra runtime config)
CREATE TABLE "settings" (
    "key" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- Announcements
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),
    "created_by_id" INTEGER,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "announcements_published_at_idx" ON "announcements"("published_at");
CREATE INDEX "announcements_archived_at_idx" ON "announcements"("archived_at");

ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Promove o user kennrick@gmail.com pra admin (idempotente — não falha se não existe)
UPDATE "users" SET "role" = 'admin' WHERE "email" = 'kennrick@gmail.com';
