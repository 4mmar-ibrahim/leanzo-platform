-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "addresses" JSONB NOT NULL DEFAULT '[]',
    "notes" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "granularPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mustChangePasswordNextLogin" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "userType" TEXT NOT NULL DEFAULT 'admin',
    "technicianId" TEXT,
    "avatar" TEXT DEFAULT 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    "createdBy" TEXT,
    "createdByName" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "shortDescriptionEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "basePrice" DOUBLE PRECISION,
    "originalPrice" DOUBLE PRECISION,
    "duration" INTEGER NOT NULL DEFAULT 45,
    "serviceDurationMinutes" INTEGER DEFAULT 45,
    "travelTimeMinutes" INTEGER DEFAULT 15,
    "totalOccupiedMinutes" INTEGER DEFAULT 60,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featuresEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inclusionsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importantNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importantNotesEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "descriptionEn" TEXT DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_addons" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "descriptionEn" TEXT DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "category" TEXT DEFAULT 'main',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_governorates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "cities" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_governorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceSnapshot" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "timeSlotStart" TEXT NOT NULL,
    "scheduledStart" TEXT NOT NULL,
    "scheduledEnd" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "serviceDurationMinutes" INTEGER NOT NULL DEFAULT 45,
    "travelTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "totalOccupiedMinutes" INTEGER NOT NULL DEFAULT 60,
    "rescheduledFrom" TEXT,
    "bookingNumber" TEXT,
    "address" JSONB NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT '╪¼.┘à',
    "promoCode" TEXT,
    "couponSnapshot" JSONB,
    "packageId" TEXT,
    "packageSnapshot" JSONB,
    "addons" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completedBy" JSONB,
    "assignedTechnicianId" TEXT,
    "technician" JSONB,
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "applicableServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalUsageLimit" INTEGER NOT NULL DEFAULT 100,
    "currentUsageCount" INTEGER NOT NULL DEFAULT 0,
    "perCustomerLimit" INTEGER NOT NULL DEFAULT 1,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT DEFAULT '╪╣┘à┘è┘ä ┘â┘ä┘è┘å╪▓┘ê',
    "orderId" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "actualDiscountAmount" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "descriptionEn" TEXT DEFAULT '',
    "discountPercentage" DOUBLE PRECISION DEFAULT 0,
    "discountValue" DOUBLE PRECISION DEFAULT 0,
    "originalPrice" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION,
    "badge" TEXT DEFAULT '╪╣╪▒╪╢ ╪«╪º╪╡',
    "badgeEn" TEXT DEFAULT 'Special Offer',
    "code" TEXT NOT NULL,
    "promoCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT DEFAULT 'active',
    "startDate" TEXT,
    "endDate" TEXT,
    "expiresAt" TEXT,
    "serviceId" TEXT,
    "category" TEXT,
    "image" TEXT DEFAULT '',
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT NOT NULL DEFAULT '/uploads/images/default-avatar.png',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "specialty" TEXT NOT NULL DEFAULT '╪║╪│┘è┘ä ╪│┘è╪º╪▒╪º╪¬ ┘ê╪¬┘å╪╕┘è┘ü ┘à┘å╪º╪▓┘ä',
    "specialtiesList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'available',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "assignedOrders" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT DEFAULT '',
    "nationalId" TEXT DEFAULT '',
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerNameEn" TEXT DEFAULT '',
    "avatar" TEXT DEFAULT '',
    "image" TEXT DEFAULT '',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "date" TEXT DEFAULT '┘à╪ñ╪«╪▒╪º┘ï',
    "service" TEXT DEFAULT '',
    "serviceName" TEXT DEFAULT '',
    "serviceEn" TEXT DEFAULT '',
    "serviceNameEn" TEXT DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'car',
    "content" TEXT DEFAULT '',
    "comment" TEXT DEFAULT '',
    "contentEn" TEXT DEFAULT '',
    "commentEn" TEXT DEFAULT '',
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT DEFAULT 'system',
    "actorName" TEXT DEFAULT 'System',
    "actorRole" TEXT DEFAULT 'admin',
    "adminId" TEXT,
    "adminName" TEXT,
    "adminRole" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'success',
    "before" JSONB,
    "after" JSONB,
    "diff" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "target" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'global_settings',
    "general" JSONB NOT NULL DEFAULT '{}',
    "booking" JSONB NOT NULL DEFAULT '{}',
    "appearance" JSONB NOT NULL DEFAULT '{}',
    "social" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "notifications" JSONB NOT NULL DEFAULT '{}',
    "security" JSONB DEFAULT '{}',
    "mobileExperience" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_contents" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "version" INTEGER NOT NULL DEFAULT 1,
    "hero" JSONB NOT NULL DEFAULT '{}',
    "about" JSONB NOT NULL DEFAULT '{}',
    "contact" JSONB NOT NULL DEFAULT '{}',
    "social" JSONB NOT NULL DEFAULT '{}',
    "sections" JSONB NOT NULL DEFAULT '{}',
    "lastPublishedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'device',
    "sourceUrl" TEXT,
    "storagePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_records" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "sizeFormatted" TEXT NOT NULL DEFAULT '0 KB',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "type" TEXT NOT NULL DEFAULT 'manual',
    "collectionsCount" INTEGER NOT NULL DEFAULT 0,
    "documentsCount" INTEGER NOT NULL DEFAULT 0,
    "mediaCount" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "manifest" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '╪º┘ä┘à┘å╪▓┘ä',
    "governorateId" TEXT NOT NULL,
    "governorateNameSnapshot" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "cityNameSnapshot" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "apartment" TEXT,
    "landmark" TEXT,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encryption_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "totalRecordsEncrypted" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,
    "initiatedBy" TEXT NOT NULL DEFAULT 'System',
    "error" TEXT,

    CONSTRAINT "encryption_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT DEFAULT '',
    "image" TEXT DEFAULT '',
    "beforeImage" TEXT,
    "afterImage" TEXT,
    "description" TEXT DEFAULT '',
    "descriptionEn" TEXT DEFAULT '',
    "displayMode" TEXT NOT NULL DEFAULT 'before_after',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "homepageFeatured" BOOLEAN NOT NULL DEFAULT false,
    "mobileFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_contents" (
    "id" TEXT NOT NULL DEFAULT 'active_about',
    "story" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "values" JSONB NOT NULL DEFAULT '[]',
    "stats" JSONB NOT NULL DEFAULT '[]',
    "team" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "message" TEXT NOT NULL,
    "messageEn" TEXT,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zo_page_configs" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageNameAr" TEXT NOT NULL DEFAULT '',
    "pageNameEn" TEXT NOT NULL DEFAULT '',
    "pageCategory" TEXT NOT NULL DEFAULT 'main',
    "pathPattern" TEXT NOT NULL DEFAULT '/',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "character" JSONB NOT NULL DEFAULT '{}',
    "desktop" JSONB NOT NULL DEFAULT '{}',
    "tablet" JSONB NOT NULL DEFAULT '{}',
    "mobile" JSONB NOT NULL DEFAULT '{}',
    "message" JSONB NOT NULL DEFAULT '{}',
    "behavior" JSONB NOT NULL DEFAULT '{}',
    "triggers" JSONB NOT NULL DEFAULT '[]',
    "draftConfig" JSONB,
    "config" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zo_page_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_username_idx" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_role_idx" ON "admin_users"("role");

-- CreateIndex
CREATE INDEX "admin_users_technicianId_idx" ON "admin_users"("technicianId");

-- CreateIndex
CREATE INDEX "admin_users_userType_idx" ON "admin_users"("userType");

-- CreateIndex
CREATE INDEX "services_category_idx" ON "services"("category");

-- CreateIndex
CREATE INDEX "services_available_idx" ON "services"("available");

-- CreateIndex
CREATE INDEX "services_isArchived_idx" ON "services"("isArchived");

-- CreateIndex
CREATE INDEX "service_packages_serviceId_idx" ON "service_packages"("serviceId");

-- CreateIndex
CREATE INDEX "service_packages_active_idx" ON "service_packages"("active");

-- CreateIndex
CREATE INDEX "service_addons_serviceId_idx" ON "service_addons"("serviceId");

-- CreateIndex
CREATE INDEX "service_addons_active_idx" ON "service_addons"("active");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

-- CreateIndex
CREATE INDEX "location_governorates_active_idx" ON "location_governorates"("active");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_customerPhone_idx" ON "bookings"("customerPhone");

-- CreateIndex
CREATE INDEX "bookings_serviceId_idx" ON "bookings"("serviceId");

-- CreateIndex
CREATE INDEX "bookings_category_idx" ON "bookings"("category");

-- CreateIndex
CREATE INDEX "bookings_date_idx" ON "bookings"("date");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_date_status_idx" ON "bookings"("date", "status");

-- CreateIndex
CREATE INDEX "bookings_assignedTechnicianId_idx" ON "bookings"("assignedTechnicianId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "coupons_startDate_idx" ON "coupons"("startDate");

-- CreateIndex
CREATE INDEX "coupons_endDate_idx" ON "coupons"("endDate");

-- CreateIndex
CREATE INDEX "coupons_isArchived_idx" ON "coupons"("isArchived");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE INDEX "coupon_usages_couponCode_idx" ON "coupon_usages"("couponCode");

-- CreateIndex
CREATE INDEX "coupon_usages_customerPhone_idx" ON "coupon_usages"("customerPhone");

-- CreateIndex
CREATE INDEX "coupon_usages_customerId_idx" ON "coupon_usages"("customerId");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_customerPhone_idx" ON "coupon_usages"("couponId", "customerPhone");

-- CreateIndex
CREATE INDEX "coupon_usages_couponCode_customerPhone_idx" ON "coupon_usages"("couponCode", "customerPhone");

-- CreateIndex
CREATE INDEX "coupon_usages_orderId_idx" ON "coupon_usages"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "offers_code_key" ON "offers"("code");

-- CreateIndex
CREATE INDEX "offers_code_idx" ON "offers"("code");

-- CreateIndex
CREATE INDEX "offers_active_idx" ON "offers"("active");

-- CreateIndex
CREATE INDEX "offers_isArchived_idx" ON "offers"("isArchived");

-- CreateIndex
CREATE INDEX "technicians_status_idx" ON "technicians"("status");

-- CreateIndex
CREATE INDEX "technicians_active_idx" ON "technicians"("active");

-- CreateIndex
CREATE INDEX "technicians_phone_idx" ON "technicians"("phone");

-- CreateIndex
CREATE INDEX "reviews_category_idx" ON "reviews"("category");

-- CreateIndex
CREATE INDEX "reviews_visible_idx" ON "reviews"("visible");

-- CreateIndex
CREATE INDEX "reviews_order_idx" ON "reviews"("order");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_status_idx" ON "audit_logs"("status");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "media_fileName_key" ON "media"("fileName");

-- CreateIndex
CREATE INDEX "media_fileName_idx" ON "media"("fileName");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "media_isArchived_idx" ON "media"("isArchived");

-- CreateIndex
CREATE INDEX "backup_records_status_idx" ON "backup_records"("status");

-- CreateIndex
CREATE INDEX "backup_records_type_idx" ON "backup_records"("type");

-- CreateIndex
CREATE INDEX "backup_records_createdAt_idx" ON "backup_records"("createdAt");

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");

-- CreateIndex
CREATE INDEX "customer_addresses_customerPhone_idx" ON "customer_addresses"("customerPhone");

-- CreateIndex
CREATE INDEX "customer_addresses_governorateId_idx" ON "customer_addresses"("governorateId");

-- CreateIndex
CREATE INDEX "customer_addresses_cityId_idx" ON "customer_addresses"("cityId");

-- CreateIndex
CREATE INDEX "encryption_logs_timestamp_idx" ON "encryption_logs"("timestamp");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "faqs_visible_idx" ON "faqs"("visible");

-- CreateIndex
CREATE INDEX "portfolio_items_category_idx" ON "portfolio_items"("category");

-- CreateIndex
CREATE INDEX "portfolio_items_visible_idx" ON "portfolio_items"("visible");

-- CreateIndex
CREATE INDEX "contact_messages_phone_idx" ON "contact_messages"("phone");

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "notifications_target_idx" ON "notifications"("target");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE UNIQUE INDEX "zo_page_configs_pageId_key" ON "zo_page_configs"("pageId");

-- CreateIndex
CREATE INDEX "zo_page_configs_pageId_idx" ON "zo_page_configs"("pageId");

-- CreateIndex
CREATE INDEX "zo_page_configs_enabled_idx" ON "zo_page_configs"("enabled");

-- CreateIndex
CREATE INDEX "zo_page_configs_isPublished_idx" ON "zo_page_configs"("isPublished");

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

