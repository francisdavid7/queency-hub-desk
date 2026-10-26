-- CreateIndex
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");


-- Prisma's own bookkeeping table is also in the public schema; keep it
-- out of reach of Supabase's Data API too.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
