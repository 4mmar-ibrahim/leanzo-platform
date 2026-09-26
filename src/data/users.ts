import { User, Address } from '@/types';

export const initialAddresses: Address[] = [
  {
    id: 'addr-1',
    label: 'المنزل',
    governorate: 'المنيا',
    city: 'المنيا الجديدة',
    area: 'الحي الرابع - شارع النخيل',
    building: 'عمارة 14',
    floor: 'الدور الثالث',
    apartment: 'شقة 7',
    details: 'بجوار مدرسة الأوائل الخاصة',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'مقر العمل / المكتب',
    governorate: 'المنيا',
    city: 'مدينة المنيا (وسط البلد)',
    area: 'كورنيش النيل',
    building: 'برج النيل التجاري',
    floor: 'الدور الخامس',
    apartment: 'مكتب 502',
    details: 'أمام حديقة الخالدين',
    isDefault: false,
  },
];

export const defaultMockUser: User = {
  id: 'usr-cleanzo-001',
  name: 'أحمد المحمدي',
  phone: '01012345678',
  email: 'ahmed.mohamady@cleanzo.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  createdAt: '2024-03-15',
  addresses: initialAddresses,
};
