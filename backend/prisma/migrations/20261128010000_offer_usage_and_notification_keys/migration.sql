CREATE TABLE "offer_usages" (
  "orderId" TEXT PRIMARY KEY,
  "offerId" TEXT NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "customerPhone" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "offer_usages_offerId_customerPhone_idx" ON "offer_usages"("offerId", "customerPhone");

INSERT INTO "offer_usages" ("orderId", "offerId", "customerPhone", "usedAt")
SELECT b."id", o."id", b."customerPhone", b."createdAt"
FROM "bookings" b
JOIN "offers" o ON o."id" = b."couponSnapshot"->>'couponId' AND o."code" = b."couponSnapshot"->>'couponCode'
WHERE b."customerPhone" IS NOT NULL
ON CONFLICT ("orderId") DO NOTHING;

WITH duplicate_events AS (
  SELECT "id", row_number() OVER (PARTITION BY "eventId" ORDER BY "createdAt", "id") AS position
  FROM "notifications" WHERE "eventId" IS NOT NULL
)
UPDATE "notifications" n SET "eventId" = NULL FROM duplicate_events d
WHERE n."id" = d."id" AND d.position > 1;
DROP INDEX IF EXISTS "notifications_eventId_idx";
CREATE UNIQUE INDEX "notifications_eventId_key" ON "notifications"("eventId");

CREATE UNIQUE INDEX "coupon_usages_couponId_orderId_key" ON "coupon_usages"("couponId", "orderId");
