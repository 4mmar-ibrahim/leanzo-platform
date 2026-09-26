import { ServiceCategoryItem } from '@/types';

export const initialCategories: ServiceCategoryItem[] = [
  {
    id: 'cat-car',
    slug: 'car',
    name: 'خدمات السيارات',
    nameEn: 'Car Services',
    description: 'غسيل احترافي متنقل، تلميع ساطع، وعناية ديتيلينج شاملة أمام منزلك.',
    descriptionEn: 'Mobile premium car wash, steam detailing, and paint protection at your doorstep.',
    icon: 'Car',
    image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80',
    active: true,
    order: 1,
  },
  {
    id: 'cat-home',
    slug: 'home',
    name: 'خدمات المنازل',
    nameEn: 'Home Services',
    description: 'تنظيف عميق بالبخار، غسيل كنب وسجاد، وتعقيم طبيعي معتمد لبيئة صحية.',
    descriptionEn: 'Deep steam cleaning, upholstery sanitation, and home hygiene care.',
    icon: 'Home',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    active: true,
    order: 2,
  },
];
