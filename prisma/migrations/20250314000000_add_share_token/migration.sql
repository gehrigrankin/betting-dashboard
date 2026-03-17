-- AlterTable
ALTER TABLE "Dashboard" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Dashboard_shareToken_key" ON "Dashboard"("shareToken") WHERE "shareToken" IS NOT NULL;
