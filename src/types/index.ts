export type ServiceCategory = 'car' | 'home' | (string & {});

export interface ServiceFeature {
  id: string;
  title: string;
  included: boolean;
}

export interface Service {
  id: string;
  category: ServiceCategory;
  title: string;
  titleEn: string;
  shortDescription: string;
  shortDescriptionEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  price: number;
  originalPrice?: number;
  duration: number; // in minutes (legacy alias)
  serviceDurationMinutes?: number;
  travelTimeMinutes?: number;
  totalOccupiedMinutes?: number;
  rating: number;
  reviewCount: number;
  popular?: boolean;
  available: boolean;
  discount?: number; // percentage
  features: string[];
  featuresEn: string[];
  inclusions: string[];
  inclusionsEn: string[];
  importantNotes?: string[];
  importantNotesEn?: string[];
  packages?: ServicePackage[];
  addons?: ServiceAddon[];
}

export interface ServicePackage {
  id: string;
  serviceId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  originalPrice?: number;
  durationMinutes: number;
  active: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceAddon {
  id: string;
  serviceId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  durationMinutes: number;
  active: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'assigned' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  labelEn: string;
  timestamp: string;
  completed: boolean;
  description?: string;
  descriptionEn?: string;
}

export interface Address {
  id: string;
  _id?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  label: string; // e.g. "المنزل", "العمل"
  governorateId?: string;
  governorateNameSnapshot?: string;
  cityId?: string;
  cityNameSnapshot?: string;
  governorate: string; // e.g. "المنيا", "القاهرة"
  city: string; // e.g. "المنيا الجديدة"
  area: string; // e.g. "الحي الرابع، شارع النخيل"
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  notes?: string;
  details?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  createdAt: string;
  addresses: Address[];
  status?: 'active' | 'inactive' | 'suspended' | 'deleted' | 'disabled';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  rating: number;
  specialty: string;
}

export interface Order {
  id: string; // e.g. CLZ-2026-000124
  userId: string;
  serviceId: string;
  service: Service;
  category: ServiceCategory;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "11:00 AM"
  scheduledStart?: string; // "11:00"
  scheduledEnd?: string; // "12:00"
  duration?: number;
  serviceDurationMinutes?: number;
  travelTimeMinutes?: number;
  totalOccupiedMinutes?: number;
  rescheduledFrom?: string;
  address: Address;
  basePrice: number;
  discount: number;
  serviceFee: number;
  finalPrice: number;
  currency: string;
  customerName?: string;
  customerPhone?: string;
  promoCode?: string;
  couponSnapshot?: {
    couponId: string;
    couponCode: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount?: number;
    actualDiscountAmount: number;
    originalPrice: number;
    finalPrice: number;
  };
  packageId?: string;
  packageSnapshot?: {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    price: number;
    originalPrice?: number;
    durationMinutes: number;
  };
  addons?: Array<{
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    price: number;
    durationMinutes: number;
  }>;
  status: OrderStatus;
  completedAt?: string | Date;
  completedBy?: {
    id?: string;
    name?: string;
    role?: string;
  };
  technician?: Technician;
  timeline: OrderTimelineEvent[];
  notes?: string;
  createdAt: string;
}

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'inactive';
export type CouponComputedStatus = 'active' | 'inactive' | 'expired' | 'exhausted';

export interface Coupon {
  _id?: string;
  id?: string;
  code: string;
  name?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  totalUsageLimit: number;
  currentUsageCount: number;
  perCustomerLimit: number;
  minOrderAmount?: number;
  maxDiscount?: number | null;
  applicableServiceIds?: string[];
  startDate: string;
  endDate: string;
  status: CouponStatus;
  isArchived: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  computedStatus?: CouponComputedStatus;
  remainingUsages?: number;
}

export interface CouponUsageItem {
  _id: string;
  couponId: string;
  couponCode: string;
  customerPhone: string;
  customerId?: string;
  customerName?: string;
  orderId: string;
  discountType: CouponDiscountType;
  discountValue: number;
  actualDiscountAmount: number;
  originalPrice: number;
  finalPrice: number;
  usedAt: string;
}

export interface Offer {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  discountPercentage: number;
  code: string;
  expiresAt: string;
  startDate?: string;
  badge: string;
  badgeEn: string;
  serviceId?: string;
  category?: ServiceCategory;
  image: string;
  active?: boolean;
  isArchived?: boolean;
  promoCode?: string;
  usageLimit?: number | null;
  usageCount?: number;
}

export type GalleryDisplayMode =
  | 'featured_hero'
  | 'editorial'
  | 'before_after'
  | 'horizontal_slider'
  | 'full_width'
  | 'standard_card';

export interface GalleryItem {
  id: string;
  title: string;
  titleEn: string;
  category: ServiceCategory;
  subCategory: string;
  image: string;
  beforeImage?: string;
  afterImage?: string;
  description: string;
  descriptionEn: string;
  displayMode?: GalleryDisplayMode;
  featured?: boolean;
  homepageFeatured?: boolean;
  mobileFeatured?: boolean;
  sortOrder?: number;
  visible?: boolean;
}

export interface Review {
  id: string;
  customerName: string;
  customerNameEn?: string;
  avatar?: string;
  image?: string;
  rating?: number;
  date?: string;
  comment: string;
  commentEn?: string;
  serviceName: string;
  serviceNameEn?: string;
  category?: ServiceCategory;
  verified?: boolean;
  visible?: boolean;
  order?: number;
}

export interface LocationCity {
  id: string;
  name: string;
  nameEn: string;
  active?: boolean;
  order?: number;
  areas?: { id: string; name: string; nameEn: string; active?: boolean }[];
}

export interface LocationGovernorate {
  id: string;
  name: string;
  nameEn: string;
  active?: boolean;
  order?: number;
  cities: LocationCity[];
}

// -------------------------------------------------------------
// PHASE 2 ADMIN & EXTENDED ENTITIES
// -------------------------------------------------------------

export interface ServiceCategoryItem {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  image: string;
  active: boolean;
  order: number;
}

export interface TechnicianExtended extends Technician {
  nameEn?: string;
  specialtyEn?: string;
  experienceYears?: number;
  status: 'available' | 'busy' | 'offline';
  active: boolean;
  completedOrders: number;
  assignedOrders: number;
  specialtiesList: string[];
  email?: string;
  bio?: string;
  bioEn?: string;
  nationalId?: string;
  joinedDate?: string | Date;
}

export interface TechnicianServiceExecution {
  id: string;
  title: string;
  category: string;
  count: number;
  completedCount: number;
}

export interface TechnicianMonthlyTrendItem {
  month: string;
  label: string;
  assignedCount: number;
  completedCount: number;
  cancelledCount: number;
}

export interface TechnicianAnalyticsSummary {
  technician: TechnicianExtended;
  metrics: {
    totalAssigned: number;
    completedOrders: number;
    cancelledOrders: number;
    inProgressOrders: number;
    pendingOrders: number;
    uniqueCustomersCount: number;
    completionRate: number;
  };
  servicesExecuted: TechnicianServiceExecution[];
  monthlyTrend: TechnicianMonthlyTrendItem[];
  recentOrders: any[];
  orders: any[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface CustomerAnalyticsSummary {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  servicesCount: number;
  servicesBreakdown: Array<{
    id: string;
    title: string;
    category: string;
    count: number;
    totalSpent: number;
    lastUsed: string;
  }>;
  promotionsUsed: Array<{
    orderId: string;
    date: string;
    promoCode: string;
    discountAmount: number;
    finalPrice: number;
    status: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    label: string;
    ordersCount: number;
    spending: number;
  }>;
}

export interface CustomerProfile extends User {
  status: 'active' | 'inactive' | 'suspended' | 'deleted' | 'disabled';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  source: 'website' | 'whatsapp' | 'facebook' | 'instagram' | 'telegram' | 'tiktok' | 'social_media' | 'other';
  totalSpent: number;
  ordersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  lastOrderDate?: string;
  notes: { id: string; text: string; date: string; author: string }[];
  tags: string[];
  discount?: number; // Custom percentage discount
}

export type AdminRole = 
  | 'owner' 
  | 'admin' 
  | 'manager' 
  | 'booking_manager' 
  | 'content_manager' 
  | 'support' 
  | 'technician';

export type AdminPermissionModule = 
  | 'dashboard' 
  | 'customers' 
  | 'orders' 
  | 'services' 
  | 'offers' 
  | 'coupons'
  | 'gallery' 
  | 'content' 
  | 'locations' 
  | 'technicians' 
  | 'reports' 
  | 'analytics' 
  | 'notifications' 
  | 'users' 
  | 'roles' 
  | 'settings' 
  | 'activity_logs';

export type AdminPermissionAction = 
  | 'view' 
  | 'create' 
  | 'edit' 
  | 'delete' 
  | 'assign' 
  | 'export' 
  | 'manage';

export interface RoleDefinition {
  id: AdminRole | string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  permissions: Record<AdminPermissionModule, AdminPermissionAction[]>;
}

export type PermissionLevel = 'hidden' | 'view' | 'edit';

export interface AdminModuleItem {
  id: string;
  nameAr: string;
  category: string;
  path: string;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: AdminRole | string;
  userType?: 'admin' | 'technician';
  technicianId?: string;
  technicianName?: string;
  status: 'active' | 'inactive';
  avatar: string;
  permissions?: Record<string, PermissionLevel>;
  customPermissions?: Record<string, PermissionLevel>;
  granularPermissions?: string[];
  mustChangePasswordNextLogin?: boolean;
  createdByName?: string;
  createdAt: string;
  lastLogin?: string;
}

export type AuditLogStatus = 'success' | 'warning' | 'failed' | 'critical';

export interface AuditFieldDiff {
  field: string;
  fieldLabelAr?: string;
  before: any;
  after: any;
}

export interface ActivityLog {
  id: string;
  _id?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  adminId?: string;
  adminName?: string;
  adminRole?: string;
  action: string;
  module: AdminPermissionModule | string;
  entityType?: string;
  entityId?: string;
  description?: string;
  status?: AuditLogStatus;
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: AuditFieldDiff[];
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  target?: string;
  targetId?: string;
  details?: string;
  timestamp: string;
  createdAt?: string;
}

export interface AuditLogSummary {
  total: number;
  success: number;
  warning: number;
  failed: number;
  critical: number;
}

export interface AuditLogPaginationResponse {
  logs: ActivityLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  summary: AuditLogSummary;
}

export interface AuditLogFilterParams {
  module?: string;
  action?: string;
  status?: string;
  actorId?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type BackupStatus = 'completed' | 'in_progress' | 'failed' | 'restoring';
export type BackupType = 'full' | 'database_only' | 'pre_restore';

export interface BackupRecord {
  id: string;
  _id?: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  status: BackupStatus;
  type: BackupType;
  collectionsCount: number;
  documentsCount: number;
  mediaCount: number;
  checksum: string;
  notes?: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  error?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CMSActionDestinationType =
  | 'internal'
  | 'booking'
  | 'services'
  | 'category'
  | 'service'
  | 'section'
  | 'external';

export interface CMSActionButton {
  id: string;
  label: string;
  labelEn?: string;
  enabled: boolean;
  destinationType: CMSActionDestinationType;
  destinationValue: string;
  order?: number;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface CMSHeroSection {
  headline: string;
  headlineEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  carImage?: string;
  homeImage?: string;
  primaryCtaText: string;
  primaryCtaTextEn: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaTextEn: string;
  secondaryCtaLink: string;
  announcement: string;
  announcementEn: string;
  badge?: string;
  badgeEn?: string;
  actionButtons?: CMSActionButton[];
}

export interface CMSAboutSection {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  mission: string;
  missionEn: string;
  vision: string;
  visionEn: string;
  story: string;
  storyEn: string;
  stats: { id: string; label: string; labelEn: string; value: string }[];
}

export interface CMSContactSection {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  addressEn: string;
  workingHours: string;
  workingHoursEn: string;
  mapsUrl: string;
  supportNote: string;
  supportNoteEn: string;
}

export type SocialPlatformKey =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'whatsapp'
  | 'twitter'
  | 'linkedin'
  | 'snapchat'
  | 'telegram'
  | 'threads'
  | 'pinterest'
  | 'custom';

export interface SocialLinkItem {
  id: string;
  platform: SocialPlatformKey;
  name: string;
  nameEn?: string;
  url: string;
  visible: boolean;
  order: number;
  customColor?: string;
  customIconUrl?: string;
}

export interface CMSSocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
  twitter?: string;
  linkedin?: string;
  items?: SocialLinkItem[];
}

export interface CMSSectionConfig {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  visible: boolean;
  order: number;
}

export interface CMSContentData {
  _id?: string;
  status: 'draft' | 'published';
  version: number;
  hero: CMSHeroSection;
  about: CMSAboutSection;
  contact: CMSContactSection;
  social: CMSSocialLinks;
  sections: CMSSectionConfig[];
  lastPublishedAt?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface BookingSettings {
  workingDays: number[]; // 0=Sunday, 1=Monday, ... 5=Friday, 6=Saturday
  workingHoursStart: string; // e.g. "09:00"
  workingHoursEnd: string; // e.g. "22:00"
  breakStart?: string;
  breakEnd?: string;
  slotDuration: number; // in minutes
  slotInterval: number; // in minutes
  bufferTime: number; // in minutes
  maxBookingsPerSlot: number;
  advanceBookingDays: number;
  minNoticeHours: number;
  sameDayBooking: boolean;
  blockedDates: string[];
  holidays: { date: string; name: string }[];
}

export interface AppearanceSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultTheme: 'light' | 'dark' | 'system';
  siteTitle: string;
  siteTitleEn: string;
  siteDescription: string;
  siteDescriptionEn: string;
  logoText: string;
}

export interface FAQItem {
  id: string;
  category: 'car' | 'home' | 'booking' | 'general';
  question: string;
  questionEn: string;
  answer: string;
  answerEn: string;
  order: number;
  visible: boolean;
  relatedIds?: string[];
}

export interface MobileExperienceSettings {
  enableMobileLayout: boolean;
  enableBottomNavigation: boolean;
  enableQuickBooking: boolean;
  showHeroOnMobile: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showFAQ: boolean;
  showContact: boolean;
  showFloatingBookingButton: boolean;
  defaultHomeSection: 'services' | 'offers' | 'categories';
  animations: boolean;
  showReviews?: boolean;
  showServices?: boolean;
  showWelcomeCard?: boolean;
  showBannerOnMobile?: boolean;
}

export interface BrandingSettings {
  logoText: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: 'cairo' | 'inter' | 'tajawal';
  heroImages: {
    car: string;
    home: string;
  };
  ctaText: string;
  ctaTextEn: string;
  footerText: string;
  footerTextEn: string;
  footerQuickLinks?: FooterLinkItem[];
  footerCategoryLinks?: FooterLinkItem[];
  topBanner: {
    enabled: boolean;
    text: string;
    textEn: string;
    discountBadge: string;
    link: string;
    bgColor: string;
  };
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface FooterLinkItem {
  id: string;
  label: string;
  labelEn: string;
  url: string;
  visible?: boolean;
  order?: number;
}

export interface CustomerNotification {
  id: string;
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  timestamp: string;
  read: boolean;
  type: 'order' | 'offer' | 'info';
  link?: string;
}

export interface CMSVersionItem {
  id: string;
  section: string;
  timestamp: string;
  author: string;
  snapshot: any;
}

export interface SystemSettings {
  general: {
    companyName: string;
    companyNameEn: string;
    defaultLanguage: 'ar' | 'en';
    currency: string;
    currencyEn: string;
    timezone: string;
  };
  booking: BookingSettings;
  appearance: AppearanceSettings;
  social: CMSSocialLinks;
  mobileExperience: MobileExperienceSettings;
  branding: BrandingSettings;
  notifications: {
    emailAlerts: boolean;
    whatsappAlerts: boolean;
    browserAlerts: boolean;
    orderCreatedNotify: boolean;
    orderCancelledNotify: boolean;
    newCustomerNotify: boolean;
  };
  mascot?: ZoSettings;
  security?: any;
}

export type ZoExpression =
  | 'welcome'
  | 'happy'
  | 'confident'
  | 'thinking'
  | 'curious'
  | 'wink'
  | 'surprised'
  | 'funny'
  | 'excited'
  | 'calm'
  | 'helpful'
  | 'warning'
  | 'error'
  | 'success'
  | 'celebration'
  | 'cleaning'
  | 'booking'
  | 'location'
  | 'faq'
  | 'offer'
  | 'loading'
  | 'empty_state'
  | 'suspicious'
  | 'chill';

export type ZoPose =
  | 'waving'
  | 'pointing'
  | 'thumbs_up'
  | 'thinking'
  | 'walking'
  | 'welcoming'
  | 'holding_calendar'
  | 'holding_pin'
  | 'holding_cleaning_tool'
  | 'holding_coupon'
  | 'taking_photo'
  | 'celebrating'
  | 'looking_around'
  | 'sitting'
  | 'leaning'
  | 'running'
  | 'side_look'
  | 'sunglasses';

export interface ZoMessageItem {
  id: string;
  page:
    | 'home'
    | 'services'
    | 'car'
    | 'home_care'
    | 'service_details'
    | 'booking'
    | 'address'
    | 'confirmation'
    | 'error'
    | 'loading'
    | 'empty_state'
    | 'offers'
    | 'faq'
    | 'gallery'
    | 'global';
  trigger: string;
  expression: ZoExpression;
  pose: ZoPose;
  message: string;
  messageEn?: string;
  duration: number; // in milliseconds
  enabled: boolean;
}

export type ZoPlacementPosition =
  | 'start'
  | 'center'
  | 'end'
  | 'hero_visual'
  | 'filter_bar'
  | 'sidebar'
  | 'top_banner'
  | 'greeting_card';

export interface ZoPagePlacement {
  pageId: string;
  pageNameAr: string;
  pageNameEn: string;
  enabled: boolean;
  pose: ZoPose;
  expression: ZoExpression;
  messageAr: string;
  messageEn: string;
  position: ZoPlacementPosition;
  customImage?: string;
  customVideo?: string;
  mediaType?: 'image' | 'video' | 'auto';
}

export interface ZoSettings {
  enabled: boolean;
  desktopEnabled: boolean;
  mobileEnabled: boolean;
  defaultPosition: 'bottom-end' | 'bottom-start';
  size: 'sm' | 'md' | 'lg';
  animationIntensity: 'subtle' | 'standard' | 'off';
  idleAnimation: 'breathe' | 'float' | 'blink';
  showOnHome: boolean;
  showOnServices: boolean;
  showOnBooking: boolean;
  showOnLogin: boolean;
  showOnFAQ: boolean;
  showOnOffers: boolean;
  showOnGallery: boolean;
  showOnSuccess: boolean;
  showOnError: boolean;
  showOnEmptyStates: boolean;
  messages: ZoMessageItem[];
  pagePlacements?: Record<string, ZoPagePlacement>;
  renderMode?: 'rigged_living' | 'custom_image' | 'video';
  customImages?: Record<string, string>;
  customVideos?: Record<string, string>;
  videoBlendMode?: 'normal' | 'screen' | 'multiply' | 'darken' | 'color-burn' | 'lighten';
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: 'order' | 'customer' | 'system' | 'technician';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface MediaItem {
  id: string;
  _id?: string;
  originalName: string;
  fileName: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  source: 'device' | 'url';
  sourceUrl?: string;
  storagePath: string;
  url: string;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaPaginationResponse {
  items: MediaItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    totalItems: number;
    imagesCount: number;
    videosCount: number;
    totalBytes: number;
  };
}

export * from './zoStudioTypes';

