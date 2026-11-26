ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "eventId" TEXT;
CREATE INDEX IF NOT EXISTS "notifications_eventId_idx" ON "notifications"("eventId");
