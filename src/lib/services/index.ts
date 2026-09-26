import { useServiceStore } from '@/store/useServiceStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useOfferStore } from '@/store/useOfferStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { OrderStatus, Service, Technician } from '@/types';

export const servicesService = {
  getAll: () => useServiceStore.getState().services,
  getById: (id: string) => useServiceStore.getState().getServiceById(id),
  getByCategory: (cat: 'car' | 'home' | 'all') => useServiceStore.getState().getServicesByCategory(cat),
  create: (data: Omit<Service, 'id' | 'rating' | 'reviewCount'>) => useServiceStore.getState().addService(data),
  update: (id: string, updates: Partial<Service>) => useServiceStore.getState().updateService(id, updates),
  delete: (id: string) => useServiceStore.getState().deleteService(id),
  duplicate: (id: string) => useServiceStore.getState().duplicateService(id),
  toggleVisibility: (id: string) => useServiceStore.getState().toggleServiceVisibility(id),
  reorder: (start: number, end: number) => useServiceStore.getState().reorderServices(start, end),
  getCategories: () => useServiceStore.getState().categories,
};

export const ordersService = {
  getAll: () => useOrderStore.getState().orders,
  getById: (id: string) => useOrderStore.getState().getOrderById(id),
  getByStatus: (status?: OrderStatus | 'all') => useOrderStore.getState().getOrdersByStatus(status),
  create: (order: any) => useOrderStore.getState().addOrder(order),
  updateStatus: (id: string, status: OrderStatus, note?: string, actor?: string) =>
    useOrderStore.getState().updateOrderStatus(id, status, note, actor),
  assignTechnician: (orderId: string, technician: Technician) =>
    useOrderStore.getState().assignTechnician(orderId, technician),
  bulkUpdateStatus: (ids: string[], status: OrderStatus) =>
    useOrderStore.getState().bulkUpdateStatus(ids, status),
  cancel: (id: string, reason?: string) => useOrderStore.getState().cancelOrder(id, reason),
  delete: (id: string) => useOrderStore.getState().deleteOrder(id),
};

export const customersService = {
  getAll: () => useCustomerStore.getState().customers,
  getById: (id: string) => useCustomerStore.getState().getCustomerById(id),
  create: (data: any) => useCustomerStore.getState().addCustomer(data),
  update: (id: string, updates: any) => useCustomerStore.getState().updateCustomer(id, updates),
  delete: (id: string) => useCustomerStore.getState().deleteCustomer(id),
  toggleStatus: (id: string) => useCustomerStore.getState().toggleCustomerStatus(id),
  addNote: (id: string, text: string, author: string) => useCustomerStore.getState().addCustomerNote(id, text, author),
  setDiscount: (id: string, discount: number) => useCustomerStore.getState().setCustomerDiscount(id, discount),
};

export const offersService = {
  getAll: () => useOfferStore.getState().offers,
  getActive: () => useOfferStore.getState().getActiveOffers(),
  getById: (id: string) => useOfferStore.getState().getOfferById(id),
  create: (data: any) => useOfferStore.getState().addOffer(data),
  update: (id: string, updates: any) => useOfferStore.getState().updateOffer(id, updates),
  delete: (id: string) => useOfferStore.getState().deleteOffer(id),
  toggleActive: (id: string) => useOfferStore.getState().toggleOfferActive(id),
  duplicate: (id: string) => useOfferStore.getState().duplicateOffer(id),
};

export const techniciansService = {
  getAll: () => useTechnicianStore.getState().technicians,
  getAvailable: () => useTechnicianStore.getState().getAvailableTechnicians(),
  getById: (id: string) => useTechnicianStore.getState().getTechnicianById(id),
  create: (data: any) => useTechnicianStore.getState().addTechnician(data),
  update: (id: string, updates: any) => useTechnicianStore.getState().updateTechnician(id, updates),
  delete: (id: string) => useTechnicianStore.getState().deleteTechnician(id),
  toggleAvailability: (id: string) => useTechnicianStore.getState().toggleAvailability(id),
  toggleActive: (id: string) => useTechnicianStore.getState().toggleActive(id),
};

export const locationsService = {
  getAll: () => useLocationStore.getState().governorates,
  addGov: (name: string, nameEn: string) => useLocationStore.getState().addGovernorate(name, nameEn),
  deleteGov: (id: string) => useLocationStore.getState().deleteGovernorate(id),
  addCity: (govId: string, name: string, nameEn: string) => useLocationStore.getState().addCity(govId, name, nameEn),
  deleteCity: (govId: string, cityId: string) => useLocationStore.getState().deleteCity(govId, cityId),
  addArea: (govId: string, cityId: string, name: string, nameEn: string) =>
    useLocationStore.getState().addArea(govId, cityId, name, nameEn),
  deleteArea: (govId: string, cityId: string, areaId: string) =>
    useLocationStore.getState().deleteArea(govId, cityId, areaId),
};

export const cmsService = {
  getContent: () => ({
    hero: useCMSStore.getState().hero,
    about: useCMSStore.getState().about,
    contact: useCMSStore.getState().contact,
    social: useCMSStore.getState().social,
    sections: useCMSStore.getState().sections,
  }),
  updateHero: (data: any) => useCMSStore.getState().updateHero(data),
  updateAbout: (data: any) => useCMSStore.getState().updateAbout(data),
  updateContact: (data: any) => useCMSStore.getState().updateContact(data),
  updateSocial: (data: any) => useCMSStore.getState().updateSocial(data),
  toggleSection: (id: string) => useCMSStore.getState().toggleSectionVisibility(id),
  reorderSections: (s: number, e: number) => useCMSStore.getState().reorderSections(s, e),
};

export const settingsService = {
  getSettings: () => useSettingsStore.getState().settings,
  updateGeneral: (data: any) => useSettingsStore.getState().updateGeneral(data),
  updateBooking: (data: any) => useSettingsStore.getState().updateBooking(data),
  updateAppearance: (data: any) => useSettingsStore.getState().updateAppearance(data),
  updateNotifications: (data: any) => useSettingsStore.getState().updateNotifications(data),
};

export const auditService = {
  log: (entry: { adminName: string; adminRole: string; action: string; module: any; target: string; details?: string }) =>
    useActivityLogStore.getState().addLog(entry),
};
