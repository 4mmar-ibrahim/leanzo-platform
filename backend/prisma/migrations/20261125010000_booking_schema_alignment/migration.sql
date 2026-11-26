ALTER TABLE "bookings" ALTER COLUMN "currency" SET DEFAULT 'ج.م';
ALTER TABLE "coupon_usages" ALTER COLUMN "customerName" SET DEFAULT 'عميل كلينزو';
ALTER TABLE "customer_addresses" ALTER COLUMN "label" SET DEFAULT 'المنزل';
ALTER TABLE "offers" ALTER COLUMN "badge" SET DEFAULT 'عرض خاص';
ALTER TABLE "reviews" ALTER COLUMN "date" SET DEFAULT 'مؤخراً';
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "image" TEXT DEFAULT '';
ALTER TABLE "technicians" ALTER COLUMN "specialty" SET DEFAULT 'غسيل سيارات وتنظيف منازل';

CREATE UNIQUE INDEX "bookings_idempotency_key_unique"
  ON "bookings" (("metadata" ->> 'idempotencyKey'))
  WHERE ("metadata" ->> 'idempotencyKey') IS NOT NULL;
