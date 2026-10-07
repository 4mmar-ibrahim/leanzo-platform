import { apiRequest, getApiBaseUrl } from './apiClient';
import {
  Service,
  ServiceCategory,
  ServicePackage,
  ServiceAddon,
  Order,
  Offer,
  GalleryItem,
  FAQItem,
  Review,
  User,
  AdminUser,
  Coupon,
  CouponUsageItem,
  Address,
  LocationGovernorate,
  LocationCity,
  MediaItem,

  MediaPaginationResponse,
  CMSContentData,
  CMSHeroSection,
  CMSAboutSection,
  CMSContactSection,
  CMSSocialLinks,
  CMSSectionConfig,
  AuditLogPaginationResponse,
  AuditLogFilterParams,
  BackupRecord,
  TechnicianExtended,
  TechnicianAnalyticsSummary,
} from '@/types';



export const cleanzoApi = {
  // Customer Auth
  auth: {
    register: (data: { name: string; phone: string; password?: string; email?: string }) =>
      apiRequest<{ user: User; token: string }>('/auth/customer/register', {
        method: 'POST',
        body: JSON.stringify({ ...data, password: data.password || 'password123' }),
      }),
    login: (phone: string, password = 'password123') =>
      apiRequest<{ user: User; token: string }>('/auth/customer/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }),
    getProfile: () => apiRequest<User>('/auth/customer/profile'),
    refresh: () =>
      apiRequest<{ user: User; token: string }>('/auth/customer/refresh', {
        method: 'POST',
      }),
    logout: () =>
      apiRequest<null>('/auth/customer/logout', {
        method: 'POST',
      }),
    updateProfile: (data: { name?: string; email?: string; avatar?: string; phone?: string }) =>
      apiRequest<User>('/auth/customer/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    addAddress: (address: any) =>
      apiRequest<any[]>('/auth/customer/addresses', {
        method: 'POST',
        body: JSON.stringify(address),
      }),
    deleteAddress: (addressId: string) =>
      apiRequest<any[]>(`/auth/customer/addresses/${addressId}`, {
        method: 'DELETE',
      }),
  },

  // Services
  services: {
    getServices: (category?: ServiceCategory) =>
      apiRequest<Service[]>(`/services${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    getServiceById: (id: string, category?: ServiceCategory) =>
      apiRequest<Service>(`/services/${encodeURIComponent(id)}${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    getCategories: () => apiRequest<any[]>('/services/categories'),
    getAllAdmin: (includeArchived = false, category?: ServiceCategory) => {
      const params = new URLSearchParams();
      if (includeArchived) params.set('includeArchived', 'true');
      if (category) params.set('category', category);
      const q = params.toString();
      return apiRequest<Service[]>(`/services/admin/all${q ? `?${q}` : ''}`, {
        isAdmin: true,
      });
    },
    create: (serviceData: Partial<Service> & { idempotencyKey?: string }) => {
      const { idempotencyKey: customIdemp, ...restServiceData } = serviceData;
      const idempotencyKey =
        customIdemp ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `srv-idemp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      return apiRequest<Service>('/services/admin', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(restServiceData),
        isAdmin: true,
      });
    },
    update: (id: string, updates: Partial<Service>) =>
      apiRequest<Service>(`/services/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        isAdmin: true,
      }),
    delete: (id: string) =>
      apiRequest<{ id: string; isArchived: boolean }>(`/services/admin/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
    deleteCategory: (id: string) =>
      apiRequest<{ id: string; deleted: boolean }>(`/services/admin/categories/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
    createCategory: (catData: any) =>
      apiRequest<any>('/services/admin/categories', {
        method: 'POST',
        body: JSON.stringify(catData),
        isAdmin: true,
      }),
    updateCategory: (id: string, updates: any) =>
      apiRequest<any>(`/services/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        isAdmin: true,
      }),

    // Service Packages API
    getPackages: (serviceId: string, activeOnly = false) =>
      apiRequest<ServicePackage[]>(`/services/${serviceId}/packages${activeOnly ? '?activeOnly=true' : ''}`),
    createPackage: (serviceId: string, data: Partial<ServicePackage>) =>
      apiRequest<ServicePackage>(`/services/admin/${serviceId}/packages`, {
        method: 'POST',
        body: JSON.stringify(data),
        isAdmin: true,
      }),
    updatePackage: (serviceId: string, packageId: string, updates: Partial<ServicePackage>) =>
      apiRequest<ServicePackage>(`/services/admin/${serviceId}/packages/${packageId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        isAdmin: true,
      }),
    deletePackage: (serviceId: string, packageId: string) =>
      apiRequest<{ id: string; deleted?: boolean; deactivated?: boolean }>(
        `/services/admin/${serviceId}/packages/${packageId}`,
        {
          method: 'DELETE',
          isAdmin: true,
        }
      ),

    // Service Add-ons API
    getAddons: (serviceId: string, activeOnly = false) =>
      apiRequest<ServiceAddon[]>(`/services/${serviceId}/addons${activeOnly ? '?activeOnly=true' : ''}`),
    createAddon: (serviceId: string, data: Partial<ServiceAddon>) =>
      apiRequest<ServiceAddon>(`/services/admin/${serviceId}/addons`, {
        method: 'POST',
        body: JSON.stringify(data),
        isAdmin: true,
      }),
    updateAddon: (serviceId: string, addonId: string, updates: Partial<ServiceAddon>) =>
      apiRequest<ServiceAddon>(`/services/admin/${serviceId}/addons/${addonId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        isAdmin: true,
      }),
    deleteAddon: (serviceId: string, addonId: string) =>
      apiRequest<{ id: string; deleted?: boolean; deactivated?: boolean }>(
        `/services/admin/${serviceId}/addons/${addonId}`,
        {
          method: 'DELETE',
          isAdmin: true,
        }
      ),
  },

  // Locations & Areas (Hierarchical)
  locations: {
    getLocations: () => apiRequest<LocationGovernorate[]>('/locations'),
    getActive: () => apiRequest<LocationGovernorate[]>('/locations/active'),
    getCities: (governorateId: string) =>
      apiRequest<LocationCity[]>(`/locations/${governorateId}/cities`),
    getCitiesByGovernorate: (governorateId: string) =>
      apiRequest<LocationCity[]>(`/locations/${governorateId}/cities`),
  },

  // Availability Engine
  availability: {
    checkDate: (date: string, serviceId?: string, duration?: number) => {
      const params = new URLSearchParams({ date });
      if (serviceId) params.append('serviceId', serviceId);
      if (duration) params.append('duration', String(duration));
      return apiRequest<{
        date: string;
        isDayAvailable: boolean;
        dayReason?: string;
        slots: Array<{
          time: string;
          time24: string;
          label?: string;
          labelEn?: string;
          start?: string;
          end?: string;
          available: boolean;
          reason?: string;
          serviceDurationMinutes?: number;
          travelTimeMinutes?: number;
          totalOccupiedMinutes?: number;
        }>;
      }>(`/availability?${params.toString()}`);
    },
    validateSlot: (date: string, time: string, serviceId?: string, duration?: number) =>
      apiRequest<{ valid: boolean; message: string }>('/availability/check-slot', {
        method: 'POST',
        body: JSON.stringify({ date, time, serviceId, duration }),
      }),
  },

  // Bookings & Orders
  bookings: {
    create: (bookingData: {
      serviceId?: string;
      services?: Array<{ serviceId: string; packageId?: string; addonIds?: string[] }>;
      packageId?: string;
      addonIds?: string[];
      category?: ServiceCategory;
      date: string;
      time: string;
      address: any;
      notes?: string;
      promoCode?: string;
      guestName?: string;
      guestPhone?: string;
    }) =>
      apiRequest<Order>('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      }),
    getMyBookings: () => apiRequest<Order[]>('/bookings/my'),
    getBookingById: (id: string) => apiRequest<Order>(`/bookings/${id}`),
    trackOrder: (id: string, phone?: string) =>
      apiRequest<Order>(`/bookings/track/${id}${phone ? `?phone=${phone}` : ''}`),
    calculatePrice: (options: {
      serviceId?: string;
      services?: Array<{ serviceId: string; packageId?: string; addonIds?: string[] }>;
      packageId?: string;
      addonIds?: string[];
      promoCode?: string;
      customerPhone?: string;
      category?: string;
    }) =>
      apiRequest<any>('/bookings/calculate-price', {
        method: 'POST',
        body: JSON.stringify(options),
      }),
    cancel: (id: string, reason?: string, customerPhone?: string) =>
      apiRequest<Order>(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason, customerPhone }),
      }),
  },

  // Customer Addresses (Anti-IDOR)
  addresses: {
    getAll: (phone?: string) =>
      apiRequest<Address[]>(`/addresses${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`),
    create: (addressData: Partial<Address> & { customerPhone?: string }) =>
      apiRequest<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify(addressData),
      }),
    update: (id: string, updates: Partial<Address> & { customerPhone?: string }) =>
      apiRequest<Address>(`/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    setDefault: (id: string) =>
      apiRequest<Address>(`/addresses/${id}/default`, {
        method: 'PATCH',
      }),
    delete: (id: string) =>
      apiRequest<void>(`/addresses/${id}`, {
        method: 'DELETE',
      }),
  },

  // Offers
  offers: {
    getOffers: () => apiRequest<Offer[]>('/offers'),
    getAllAdmin: (params?: { includeArchived?: boolean; status?: string; category?: string } | boolean) => {
      const searchParams = new URLSearchParams();
      if (typeof params === 'boolean') {
        if (params) searchParams.append('includeArchived', 'true');
      } else if (params) {
        if (params.includeArchived) searchParams.append('includeArchived', 'true');
        if (params.status && params.status !== 'all') searchParams.append('status', params.status);
        if (params.category && params.category !== 'all') searchParams.append('category', params.category);
      }
      const qs = searchParams.toString();
      return apiRequest<Offer[]>(`/offers/admin${qs ? `?${qs}` : ''}`, {
        isAdmin: true,
      });
    },
    create: (offerData: Partial<Offer>) =>
      apiRequest<Offer>('/offers/admin', {
        method: 'POST',
        body: JSON.stringify(offerData),
        isAdmin: true,
      }),
    update: (id: string, updates: Partial<Offer>) =>
      apiRequest<Offer>(`/offers/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        isAdmin: true,
      }),
    toggleActive: (id: string) =>
      apiRequest<Offer>(`/offers/admin/${id}/toggle`, {
        method: 'PATCH',
        isAdmin: true,
      }),
    delete: (id: string) =>
      apiRequest<{ id: string; isArchived: boolean }>(`/offers/admin/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
  },


  // Authoritative Coupons Engine
  coupons: {
    validate: (data: { code: string; serviceId?: string; basePrice?: number; customerPhone?: string }) =>
      apiRequest<{
        code: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        actualDiscountAmount: number;
        originalPrice: number;
        finalPrice: number;
        remainingTotalUsages: number;
        customerRemainingUsages: number;
      }>('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Portfolio / Gallery
  portfolio: {
    getPortfolio: (category?: 'car' | 'home') =>
      apiRequest<GalleryItem[]>(`/portfolio${category ? `?category=${category}` : ''}`),
    getAllAdmin: () =>
      apiRequest<GalleryItem[]>('/portfolio/admin', { isAdmin: true }),
    create: (data: Partial<GalleryItem>) =>
      apiRequest<GalleryItem>('/portfolio/admin', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<GalleryItem>) =>
      apiRequest<GalleryItem>(`/portfolio/admin/${id}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest<{ id: string; deleted: boolean }>(`/portfolio/admin/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
  },

  // FAQ Management
  faq: {
    getFAQs: (category?: string) =>
      apiRequest<FAQItem[]>(`/faq${category ? `?category=${category}` : ''}`),
    getPublic: () => apiRequest<FAQItem[]>('/faq'),
    getAllAdmin: () => apiRequest<FAQItem[]>('/faq/admin', { isAdmin: true }),
    create: (data: Omit<FAQItem, 'id'>) =>
      apiRequest<FAQItem>('/faq/admin', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<FAQItem>) =>
      apiRequest<FAQItem>(`/faq/admin/${id}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest<{ id: string }>(`/faq/admin/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
  },

  // Customer Reviews & Testimonials Management
  reviews: {
    getReviews: (category?: 'car' | 'home') =>
      apiRequest<Review[]>(`/reviews${category ? `?category=${category}` : ''}`),
    getPublic: (category?: 'car' | 'home') =>
      apiRequest<Review[]>(`/reviews${category ? `?category=${category}` : ''}`),
    getAllAdmin: () =>
      apiRequest<Review[]>('/reviews/admin', { isAdmin: true }),
    create: (data: Partial<Review>) =>
      apiRequest<Review>('/reviews/admin', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Review>) =>
      apiRequest<Review>(`/reviews/admin/${id}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest<{ message: string }>(`/reviews/admin/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
    deleteAllAdmin: () =>
      apiRequest<{ cleared: boolean }>('/reviews/admin/all', {
        method: 'DELETE',
        isAdmin: true,
      }),
  },

  // About Us
  about: {
    getContent: () => apiRequest<any>('/about'),
  },

  // Contact
  contact: {
    submitMessage: (data: { name: string; phone: string; email?: string; message: string; source?: string }) =>
      apiRequest<{ id: string }>('/contact', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Zo Mascot & Character System
  zo: {
    getPublishedConfigs: () => apiRequest<Record<string, any>>('/zo/published'),
    getPublishedConfigByPage: (pageId: string) => apiRequest<any>(`/zo/published/${pageId}`),
    getAllAdmin: () => apiRequest<Record<string, any>>('/zo/admin', { isAdmin: true }),
    updateDraft: (pageId: string, data: any) =>
      apiRequest<any>(`/zo/admin/draft/${pageId}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    publishPage: (pageId: string) =>
      apiRequest<any>(`/zo/admin/publish/${pageId}`, {
        method: 'POST',
        isAdmin: true,
      }),
    publishAll: (data?: any) =>
      apiRequest<any>('/zo/admin/publish-all', {
        method: 'POST',
        isAdmin: true,
        body: data ? JSON.stringify(data) : undefined,
      }),
  },

  // Admin APIs (Secured with RBAC)
  admin: {
    login: (username: string, password = 'password123') =>
      apiRequest<{ admin: AdminUser; token: string }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    refreshToken: () =>
      apiRequest<{ admin: AdminUser; token: string }>('/auth/admin/refresh', {
        method: 'POST',
        isAdmin: true,
      }),
    logout: () =>
      apiRequest<null>('/auth/admin/logout', {
        method: 'POST',
        isAdmin: true,
      }),
    getMe: () => apiRequest<AdminUser>('/auth/admin/me', { isAdmin: true }),
    updateOwnerProfile: (data: { name?: string; email?: string; phone?: string }) =>
      apiRequest<AdminUser>('/auth/admin/owner/profile', {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    changeOwnerPassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      apiRequest<{ message: string }>('/auth/admin/owner/change-password', {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    getUsers: () => apiRequest<AdminUser[]>('/auth/admin/users', { isAdmin: true }),
    createUser: (data: {
      name: string;
      username?: string;
      email?: string;
      phone?: string;
      password: string;
      role?: string;
      userType?: 'admin' | 'technician';
      technicianId?: string;
      permissions?: Record<string, string>;
      granularPermissions?: string[];
      mustChangePasswordNextLogin?: boolean;
    }) =>
      apiRequest<AdminUser>('/auth/admin/users', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: Partial<AdminUser> & { password?: string; granularPermissions?: string[]; mustChangePasswordNextLogin?: boolean }) =>
      apiRequest<AdminUser>(`/auth/admin/users/${id}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    changeUserPassword: (id: string, data: { newPassword: string; confirmPassword: string; mustChangePasswordNextLogin?: boolean }) =>
      apiRequest<{ message: string }>(`/auth/admin/users/${id}/change-password`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    deleteUser: (id: string) =>
      apiRequest<{ message: string }>(`/auth/admin/users/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
    getRoles: () =>
      apiRequest<{ modules: any[]; roles: any[] }>('/auth/admin/roles', { isAdmin: true }),
    createRole: (data: any) =>
      apiRequest<any>('/auth/admin/roles', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    updateRole: (id: string, data: any) =>
      apiRequest<any>(`/auth/admin/roles/${id}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),

    // Reports Center
    reports: {
      getOverview: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/overview${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getCustomers: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/customers${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getOrders: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/orders${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getRevenue: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/revenue${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getServices: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/services${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getAreas: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/areas${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getCoupons: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/coupons${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getBookings: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/bookings${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
      getSubscriptions: (params?: { period?: string; startDate?: string; endDate?: string }) => {
        const qs = new URLSearchParams();
        if (params?.period) qs.set('period', params.period);
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        const queryStr = qs.toString();
        return apiRequest<any>(`/reports/subscriptions${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
      },
    },

    // Analytics
    getAnalytics: (period = 'this_month', startDate?: string, endDate?: string) => {
      const qs = new URLSearchParams();
      if (period) qs.set('period', period);
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      const queryStr = qs.toString();
      return apiRequest<any>(`/analytics${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
    },
    getAIInsights: () => apiRequest<any[]>('/analytics/ai', { isAdmin: true }),
    getDashboardKPIs: (period = 'this_month', startDate?: string, endDate?: string) => {
      const qs = new URLSearchParams();
      if (period) qs.set('period', period);
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      const queryStr = qs.toString();
      return apiRequest<any>(`/dashboard/kpis${queryStr ? `?${queryStr}` : ''}`, { isAdmin: true });
    },


    // Orders
    getOrders: (params: {
      status?: string;
      category?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      bookingDateFrom?: string;
      bookingDateTo?: string;
      minPrice?: number;
      maxPrice?: number;
      serviceId?: string;
      technicianId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.category) query.set('category', params.category);
      if (params.date) query.set('date', params.date);
      if (params.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params.dateTo) query.set('dateTo', params.dateTo);
      if (params.bookingDateFrom) query.set('bookingDateFrom', params.bookingDateFrom);
      if (params.bookingDateTo) query.set('bookingDateTo', params.bookingDateTo);
      if (params.minPrice !== undefined) query.set('minPrice', params.minPrice.toString());
      if (params.maxPrice !== undefined) query.set('maxPrice', params.maxPrice.toString());
      if (params.serviceId) query.set('serviceId', params.serviceId);
      if (params.technicianId) query.set('technicianId', params.technicianId);
      if (params.search) query.set('search', params.search);
      if (params.sortBy) query.set('sortBy', params.sortBy);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);
      if (params.page) query.set('page', params.page.toString());
      if (params.limit) query.set('limit', params.limit.toString());
      return apiRequest<{ bookings: Order[]; pagination: any }>(`/bookings/admin/all?${query.toString()}`, { isAdmin: true });
    },
    getOrderById: (orderId: string) =>
      apiRequest<Order>(`/bookings/admin/${orderId}`, { isAdmin: true }),
    updateOrderStatus: (orderId: string, status: string, note?: string) =>
      apiRequest<Order>(`/bookings/admin/${orderId}/status`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify({ status, note }),
      }),
    assignTechnician: (orderId: string, technicianId: string) =>
      apiRequest<Order>(`/bookings/admin/${orderId}/assign`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify({ technicianId }),
      }),
    deleteOrder: (orderId: string) =>
      apiRequest<{ id: string; deleted: boolean }>(`/bookings/admin/${orderId}`, {
        method: 'DELETE',
        isAdmin: true,
      }),

    // Customers
    getCustomers: (params: {
      search?: string;
      status?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
      minSpent?: number;
      maxSpent?: number;
      minOrders?: number;
      maxOrders?: number;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.status) query.set('status', params.status);
      if (params.source) query.set('source', params.source);
      if (params.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params.dateTo) query.set('dateTo', params.dateTo);
      if (params.minSpent !== undefined) query.set('minSpent', params.minSpent.toString());
      if (params.maxSpent !== undefined) query.set('maxSpent', params.maxSpent.toString());
      if (params.minOrders !== undefined) query.set('minOrders', params.minOrders.toString());
      if (params.maxOrders !== undefined) query.set('maxOrders', params.maxOrders.toString());
      if (params.sortBy) query.set('sortBy', params.sortBy);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);
      if (params.page) query.set('page', params.page.toString());
      if (params.limit) query.set('limit', params.limit.toString());
      return apiRequest<{ customers: any[]; pagination: any }>(`/customers?${query.toString()}`, { isAdmin: true });
    },
    getCustomerDetails: (customerId: string) =>
      apiRequest<{
        customer: any;
        bookings: any[];
        summary?: {
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
        };
        activityLogs?: any[];
      }>(`/customers/${customerId}`, { isAdmin: true }),
    createCustomer: async (data: {
      name: string;
      phone: string;
      password?: string;
      email?: string;
      status?: string;
      tags?: string[];
      discount?: number;
      source?: string;
    }) => {
      const res = await apiRequest<any>('/customers', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      });
      return { success: true, ...(res || {}) };
    },
    updateCustomer: async (
      customerId: string,
      data: {
        status?: string;
        note?: string;
        tags?: string[];
        discount?: number;
        name?: string;
        phone?: string;
        email?: string;
        source?: string;
      }
    ) => {
      const res = await apiRequest<any>(`/customers/${customerId}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      });
      return { success: true, ...(res || {}) };
    },
    restoreCustomer: (customerId: string) =>
      apiRequest<any>(`/customers/${customerId}/restore`, {
        method: 'POST',
        isAdmin: true,
      }),
    resetCustomerPassword: (
      customerId: string,
      data: { newPassword: string; confirmPassword: string }
    ) =>
      apiRequest<{ message: string; customerId: string }>(`/customers/${customerId}/password`, {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    deleteCustomer: (customerId: string) =>
      apiRequest<{ deletedId: string; customerName: string; customerPhone: string; status?: string; isDeleted?: boolean }>(`/customers/${customerId}`, {
        method: 'DELETE',
        isAdmin: true,
      }),

    // Audit Logs
    getAuditLogs: (params: { module?: string; action?: string; search?: string; page?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.module) query.set('module', params.module);
      if (params.action) query.set('action', params.action);
      if (params.search) query.set('search', params.search);
      if (params.page) query.set('page', params.page.toString());
      return apiRequest<{ logs: any[]; pagination: any }>(`/audit-logs?${query.toString()}`, { isAdmin: true });
    },

    // Zo Studio
    getAllZoConfigs: () => apiRequest<Record<string, any>>('/zo/admin', { isAdmin: true }),
    updateZoDraft: (pageId: string, updates: any) =>
      apiRequest<any>(`/zo/admin/draft/${pageId}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(updates),
      }),
    publishZoPage: (pageId: string) =>
      apiRequest<any>(`/zo/admin/publish/${pageId}`, {
        method: 'POST',
        isAdmin: true,
      }),
    publishAllZoPages: (data?: any) =>
      apiRequest<any>('/zo/admin/publish-all', {
        method: 'POST',
        isAdmin: true,
        body: data ? JSON.stringify(data) : undefined,
      }),

    // Coupons Admin Operations
    getCoupons: (params: { search?: string; status?: string; discountType?: string; page?: number; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.status) query.set('status', params.status);
      if (params.discountType) query.set('discountType', params.discountType);
      if (params.page) query.set('page', params.page.toString());
      if (params.limit) query.set('limit', params.limit.toString());
      return apiRequest<{
        coupons: Coupon[];
        stats: {
          totalCoupons: number;
          activeCount: number;
          expiredCount: number;
          exhaustedCount: number;
          disabledCount: number;
          totalUsages: number;
        };
        pagination: any;
      }>(`/admin/coupons?${query.toString()}`, { isAdmin: true });
    },
    getCouponById: (id: string) =>
      apiRequest<Coupon>(`/admin/coupons/${id}`, { isAdmin: true }),
    createCoupon: (couponData: Partial<Coupon>) =>
      apiRequest<Coupon>('/admin/coupons', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(couponData),
      }),
    updateCoupon: (id: string, updates: Partial<Coupon>) =>
      apiRequest<Coupon>(`/admin/coupons/${id}`, {
        method: 'PATCH',
        isAdmin: true,
        body: JSON.stringify(updates),
      }),
    deleteCoupon: (id: string) =>
      apiRequest<void>(`/admin/coupons/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
    getCouponUsage: (id: string) =>
      apiRequest<{ coupon: any; usages: CouponUsageItem[] }>(`/admin/coupons/${id}/usage`, { isAdmin: true }),

    // Locations Management (Admin)
    locations: {
      getAll: () => apiRequest<LocationGovernorate[]>('/locations/admin', { isAdmin: true }),
      createGovernorate: (data: { id?: string; name: string; nameEn: string; order?: number }) =>
        apiRequest<LocationGovernorate>('/locations/admin', {
          method: 'POST',
          isAdmin: true,
          body: JSON.stringify(data),
        }),
      updateGovernorate: (id: string, data: Partial<LocationGovernorate>) =>
        apiRequest<LocationGovernorate>(`/locations/admin/${id}`, {
          method: 'PUT',
          isAdmin: true,
          body: JSON.stringify(data),
        }),
      toggleGovernorate: (id: string) =>
        apiRequest<LocationGovernorate>(`/locations/admin/${id}/toggle`, {
          method: 'PATCH',
          isAdmin: true,
        }),
      deleteGovernorate: (id: string) =>
        apiRequest<void>(`/locations/admin/${id}`, {
          method: 'DELETE',
          isAdmin: true,
        }),
      addCity: (govId: string, data: { cityId?: string; name: string; nameEn: string; order?: number }) =>
        apiRequest<LocationGovernorate>(`/locations/admin/${govId}/cities`, {
          method: 'POST',
          isAdmin: true,
          body: JSON.stringify(data),
        }),
      updateCity: (govId: string, cityId: string, data: Partial<LocationCity>) =>
        apiRequest<LocationGovernorate>(`/locations/admin/${govId}/cities/${cityId}`, {
          method: 'PUT',
          isAdmin: true,
          body: JSON.stringify(data),
        }),
      toggleCity: (govId: string, cityId: string) =>
        apiRequest<LocationGovernorate>(`/locations/admin/${govId}/cities/${cityId}/toggle`, {
          method: 'PATCH',
          isAdmin: true,
        }),
      deleteCity: (govId: string, cityId: string) =>
        apiRequest<LocationGovernorate>(`/locations/admin/${govId}/cities/${cityId}`, {
          method: 'DELETE',
          isAdmin: true,
        }),
    },
  },

  // Central Unified Media Management System
  media: {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest<MediaItem>('/media/upload', {
        method: 'POST',
        isAdmin: true,
        body: formData,
      });
    },
    importUrl: (url: string, type?: 'image' | 'video') =>
      apiRequest<MediaItem>('/media/import-url', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify({ url, type }),
      }),
    getAll: (params?: { type?: 'image' | 'video'; search?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.append('type', params.type);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      return apiRequest<MediaPaginationResponse>(`/media${query ? `?${query}` : ''}`, { isAdmin: true });
    },
    getById: (id: string) => apiRequest<MediaItem>(`/media/${id}`, { isAdmin: true }),
    delete: (id: string) =>
      apiRequest<{ id: string }>(`/media/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
  },

  // Central CMS Content Management System
  content: {
    getPublished: () => apiRequest<CMSContentData>('/content'),
    getDraft: () => apiRequest<CMSContentData>('/content/admin/draft', { isAdmin: true }),
    updateDraft: (data: Partial<{
      hero: Partial<CMSHeroSection>;
      about: Partial<CMSAboutSection>;
      contact: Partial<CMSContactSection>;
      social: Partial<CMSSocialLinks>;
      sections: CMSSectionConfig[];
    }>) =>
      apiRequest<CMSContentData>('/content/admin/draft', {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    publish: () =>
      apiRequest<CMSContentData>('/content/admin/publish', {
        method: 'POST',
        isAdmin: true,
      }),
    reset: () =>
      apiRequest<CMSContentData>('/content/admin/reset', {
        method: 'POST',
        isAdmin: true,
      }),
  },

  // Central Unified Audit & Activity Log System
  audit: {
    getLogs: (params?: AuditLogFilterParams) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '' && val !== 'all') {
            searchParams.append(key, String(val));
          }
        });
      }
      const q = searchParams.toString();
      return apiRequest<AuditLogPaginationResponse>(`/audit-logs${q ? `?${q}` : ''}`, {
        isAdmin: true,
      });
    },
    exportUrl: (params?: AuditLogFilterParams) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '' && val !== 'all') {
            searchParams.append(key, String(val));
          }
        });
      }
      const q = searchParams.toString();
      const baseUrl = getApiBaseUrl() || '';
      return `${baseUrl}/audit-logs/export${q ? `?${q}` : ''}`;
    },
    purge: (retentionDays = 30) =>
      apiRequest<{ deletedCount: number; remainingCount: number; retentionDays: number }>(
        `/audit-logs/purge?retentionDays=${retentionDays}`,
        {
          method: 'DELETE',
          isAdmin: true,
        }
      ),
  },

  // Authoritative System Backup & Disaster Recovery API
  backup: {
    getAudit: () =>
      apiRequest<{
        database: string;
        tablesCount: number;
        totalRecords: number;
        tableCounts: Record<string, number>;
        foreignKeysCount: number;
        mediaCount: number;
        mediaTotalSize: string;
      }>('/admin/backups/audit', {
        isAdmin: true,
      }),
    getAll: () =>
      apiRequest<BackupRecord[]>('/admin/backups', {
        isAdmin: true,
      }),
    create: (data: { notes?: string; includeMedia?: boolean; type?: string }) =>
      apiRequest<BackupRecord>('/admin/backups', {
        method: 'POST',
        body: JSON.stringify(data),
        isAdmin: true,
      }),
    restore: (id: string) =>
      apiRequest<{
        success: boolean;
        preRestoreBackupId: string;
        restoredTablesCount: number;
        restoredDocumentsCount: number;
        restoredMediaCount: number;
        tableVerification: Record<string, { backup: number; restored: number; match: boolean }>;
        mediaVerification: { backup: number; restored: number; match: boolean };
      }>(`/admin/backups/${id}/restore`, {
        method: 'POST',
        isAdmin: true,
      }),
    validateArchive: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest<{
        isValid: boolean;
        manifest: any;
        checksumsValid: boolean;
        tablesCount: number;
        documentsCount: number;
        mediaCount: number;
        mediaTotalSize: string;
        issues: string[];
        tableComparison: Array<{
          table: string;
          backupCount: number;
          currentCount: number;
        }>;
      }>('/admin/backups/validate-archive', {
        method: 'POST',
        body: formData,
        isAdmin: true,
      });
    },
    restoreFromDevice: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest<{
        success: boolean;
        preRestoreBackupId: string;
        restoredTablesCount: number;
        restoredDocumentsCount: number;
        restoredMediaCount: number;
        tableVerification: Record<string, { backup: number; restored: number; match: boolean }>;
        mediaVerification: { backup: number; restored: number; match: boolean };
      }>('/admin/backups/restore-from-device', {
        method: 'POST',
        body: formData,
        isAdmin: true,
      });
    },
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/admin/backups/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
    getDownloadUrl: (id: string) => {
      const baseUrl = getApiBaseUrl() || '';
      return `${baseUrl}/admin/backups/${id}/download`;
    },
  },

  // System Settings & Security / Encryption API
  settings: {
    getPublic: () => apiRequest<any>('/settings/public'),
    getAllAdmin: () => apiRequest<any>('/settings/admin', { isAdmin: true }),
    updateAdmin: (data: any) =>
      apiRequest<any>('/settings/admin', {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    encryptAllData: () =>
      apiRequest<{
        isEncrypted: boolean;
        algorithm: string;
        totalRecordsEncrypted: number;
        lastEncryptedAt: string;
        breakdown: any;
      }>('/settings/admin/encrypt-all-data', {
        method: 'POST',
        isAdmin: true,
      }),
    getEncryptionStatus: () =>
      apiRequest<{
        isEncrypted: boolean;
        algorithm: string;
        totalRecordsEncrypted: number;
        lastEncryptedAt: string;
        breakdown: any;
      }>('/settings/admin/encryption-status', {
        isAdmin: true,
      }),
    getEncryptionLogs: () =>
      apiRequest<
        Array<{
          id: string;
          timestamp: string;
          status: 'success' | 'failed';
          algorithm: string;
          totalRecordsEncrypted: number;
          breakdown?: any;
          errorMessage?: string;
          initiatedBy?: string;
        }>
      >('/settings/admin/encryption-logs', {
        isAdmin: true,
      }),
    wipeAllData: (confirmation: string) =>
      apiRequest<{
        wipedAt: string;
        deletedOrders: number;
        deletedCustomers: number;
        deletedAddresses: number;
        deletedNotifications: number;
        deletedMessages: number;
        deletedCoupons: number;
        deletedOffers: number;
        deletedServices: number;
        deletedCategories: number;
        deletedPortfolio: number;
        deletedLocations: number;
        deletedTechnicians: number;
        deletedFAQs: number;
        deletedMedia: number;
        deletedReviews?: number;
        deletedAuditLogs: number;
        preservedAdmin: string;
        failedSections?: Array<{ section: string; error: string }>;
        success: boolean;
      }>('/settings/admin/wipe-all-data', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify({ confirmation }),
      }),
  },

  // Technicians Management API
  technicians: {
    getPublic: () =>
      apiRequest<TechnicianExtended[]>('/technicians/public'),
    getAll: (params?: { search?: string; status?: string; active?: string | boolean }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.append('search', params.search);
      if (params?.status) sp.append('status', params.status);
      if (params?.active !== undefined) sp.append('active', String(params.active));
      const q = sp.toString();
      return apiRequest<TechnicianExtended[]>(`/technicians${q ? `?${q}` : ''}`, { isAdmin: true });
    },
    getById: (
      id: string,
      filters?: {
        dateFrom?: string;
        dateTo?: string;
        status?: string;
        serviceId?: string;
        category?: string;
        completionStatus?: string;
        search?: string;
        page?: number;
        limit?: number;
      }
    ) => {
      const sp = new URLSearchParams();
      if (filters?.dateFrom) sp.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) sp.append('dateTo', filters.dateTo);
      if (filters?.status) sp.append('status', filters.status);
      if (filters?.serviceId) sp.append('serviceId', filters.serviceId);
      if (filters?.category) sp.append('category', filters.category);
      if (filters?.completionStatus) sp.append('completionStatus', filters.completionStatus);
      if (filters?.search) sp.append('search', filters.search);
      if (filters?.page) sp.append('page', filters.page.toString());
      if (filters?.limit) sp.append('limit', filters.limit.toString());
      const q = sp.toString();
      return apiRequest<TechnicianAnalyticsSummary>(`/technicians/${id}${q ? `?${q}` : ''}`, { isAdmin: true });
    },
    create: (data: Partial<TechnicianExtended>) =>
      apiRequest<TechnicianExtended>('/technicians', {
        method: 'POST',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<TechnicianExtended>) =>
      apiRequest<TechnicianExtended>(`/technicians/${id}`, {
        method: 'PUT',
        isAdmin: true,
        body: JSON.stringify(data),
      }),
    toggleAvailability: (id: string) =>
      apiRequest<TechnicianExtended>(`/technicians/${id}/availability`, {
        method: 'PATCH',
        isAdmin: true,
      }),
    delete: (id: string) =>
      apiRequest<{ id: string; deleted: boolean }>(`/technicians/${id}`, {
        method: 'DELETE',
        isAdmin: true,
      }),
  },
  notifications: {
    getAdmin: () =>
      apiRequest<any[]>('/notifications/admin', { isAdmin: true }),
    markAdminRead: (id: string) =>
      apiRequest<void>(`/notifications/admin/${id}/read`, { method: 'PUT', isAdmin: true }),
    markAllAdminRead: () =>
      apiRequest<void>('/notifications/admin/read-all', { method: 'PUT', isAdmin: true }),
    clearAllAdmin: () =>
      apiRequest<void>('/notifications/admin/clear-all', { method: 'DELETE', isAdmin: true }),
    deleteAdmin: (id: string) =>
      apiRequest<void>(`/notifications/admin/${id}`, { method: 'DELETE', isAdmin: true }),
    createAdmin: (data: any) =>
      apiRequest<any>('/notifications/admin', { method: 'POST', isAdmin: true, body: JSON.stringify(data) }),
    getCustomer: () =>
      apiRequest<any[]>('/notifications/customer'),
    markCustomerRead: (id: string) =>
      apiRequest<void>(`/notifications/customer/${id}/read`, { method: 'PUT' }),
  },
};



