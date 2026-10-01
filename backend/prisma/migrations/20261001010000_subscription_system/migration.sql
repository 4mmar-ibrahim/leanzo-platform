-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "subscriptions" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "descriptionEn" TEXT DEFAULT '',
    "serviceId" TEXT NOT NULL,
    "visitCount" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'active',
    "allowRenewal" BOOLEAN NOT NULL DEFAULT true,
    "allowCancellation" BOOLEAN NOT NULL DEFAULT true,
    "allowRescheduling" BOOLEAN NOT NULL DEFAULT true,
    "cancellationNoticeHours" INTEGER NOT NULL DEFAULT 12,
    "rescheduleNoticeHours" INTEGER NOT NULL DEFAULT 12,
    "cashbackPercentage" DOUBLE PRECISION DEFAULT 0,
    "cashbackAmount" DOUBLE PRECISION DEFAULT 0,
    "terms" TEXT DEFAULT '',
    "termsEn" TEXT DEFAULT '',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featuresEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceSnapshot" JSONB NOT NULL,
    "planSnapshot" JSONB NOT NULL,
    "vehicleId" TEXT,
    "vehicleDetails" JSONB,
    "address" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'car',
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalVisits" INTEGER NOT NULL,
    "usedVisits" INTEGER NOT NULL DEFAULT 0,
    "remainingVisits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalCycle" INTEGER NOT NULL DEFAULT 1,
    "renewedFromId" TEXT,
    "renewedToId" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_visits" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "visitIndex" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "timeSlotStart" TEXT NOT NULL,
    "scheduledStart" TEXT NOT NULL,
    "scheduledEnd" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 45,
    "serviceDurationMinutes" INTEGER NOT NULL DEFAULT 45,
    "travelTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "totalOccupiedMinutes" INTEGER NOT NULL DEFAULT 60,
    "serviceSnapshot" JSONB NOT NULL,
    "packageSnapshot" JSONB,
    "addons" JSONB NOT NULL DEFAULT '[]',
    "vehicleDetails" JSONB,
    "address" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTechnicianId" TEXT,
    "technician" JSONB,
    "rescheduledFrom" TEXT,
    "rescheduledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationSource" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" JSONB,
    "cashbackAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashbackAwardedAt" TIMESTAMP(3),
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_renewals" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "oldPlanId" TEXT NOT NULL,
    "newPlanId" TEXT NOT NULL,
    "newSubscriptionId" TEXT,
    "renewalCycle" INTEGER NOT NULL,
    "renewalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "renewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "subscription_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_cashbacks" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "visitId" TEXT,
    "customerId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'credit',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_cashbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_plans_serviceId_idx" ON "subscription_plans"("serviceId");
CREATE INDEX IF NOT EXISTS "subscription_plans_status_idx" ON "subscription_plans"("status");
CREATE INDEX IF NOT EXISTS "subscription_plans_order_idx" ON "subscription_plans"("order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_customerId_idx" ON "subscriptions"("customerId");
CREATE INDEX IF NOT EXISTS "subscriptions_customerPhone_idx" ON "subscriptions"("customerPhone");
CREATE INDEX IF NOT EXISTS "subscriptions_serviceId_idx" ON "subscriptions"("serviceId");
CREATE INDEX IF NOT EXISTS "subscriptions_planId_idx" ON "subscriptions"("planId");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_startDate_idx" ON "subscriptions"("startDate");
CREATE INDEX IF NOT EXISTS "subscriptions_endDate_idx" ON "subscriptions"("endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_visits_subscriptionId_idx" ON "subscription_visits"("subscriptionId");
CREATE INDEX IF NOT EXISTS "subscription_visits_customerId_idx" ON "subscription_visits"("customerId");
CREATE INDEX IF NOT EXISTS "subscription_visits_customerPhone_idx" ON "subscription_visits"("customerPhone");
CREATE INDEX IF NOT EXISTS "subscription_visits_serviceId_idx" ON "subscription_visits"("serviceId");
CREATE INDEX IF NOT EXISTS "subscription_visits_date_idx" ON "subscription_visits"("date");
CREATE INDEX IF NOT EXISTS "subscription_visits_status_idx" ON "subscription_visits"("status");
CREATE INDEX IF NOT EXISTS "subscription_visits_date_status_idx" ON "subscription_visits"("date", "status");
CREATE INDEX IF NOT EXISTS "subscription_visits_assignedTechnicianId_idx" ON "subscription_visits"("assignedTechnicianId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_renewals_subscriptionId_idx" ON "subscription_renewals"("subscriptionId");
CREATE INDEX IF NOT EXISTS "subscription_renewals_customerId_idx" ON "subscription_renewals"("customerId");
CREATE INDEX IF NOT EXISTS "subscription_renewals_newSubscriptionId_idx" ON "subscription_renewals"("newSubscriptionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_cashbacks_subscriptionId_idx" ON "subscription_cashbacks"("subscriptionId");
CREATE INDEX IF NOT EXISTS "subscription_cashbacks_visitId_idx" ON "subscription_cashbacks"("visitId");
CREATE INDEX IF NOT EXISTS "subscription_cashbacks_customerId_idx" ON "subscription_cashbacks"("customerId");
CREATE INDEX IF NOT EXISTS "subscription_cashbacks_customerPhone_idx" ON "subscription_cashbacks"("customerPhone");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_serviceId_fkey') THEN
    ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_customerId_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_planId_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_serviceId_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_visits_subscriptionId_fkey') THEN
    ALTER TABLE "subscription_visits" ADD CONSTRAINT "subscription_visits_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_visits_serviceId_fkey') THEN
    ALTER TABLE "subscription_visits" ADD CONSTRAINT "subscription_visits_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_renewals_subscriptionId_fkey') THEN
    ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_cashbacks_subscriptionId_fkey') THEN
    ALTER TABLE "subscription_cashbacks" ADD CONSTRAINT "subscription_cashbacks_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_cashbacks_visitId_fkey') THEN
    ALTER TABLE "subscription_cashbacks" ADD CONSTRAINT "subscription_cashbacks_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "subscription_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
