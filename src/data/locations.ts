import { LocationGovernorate } from '@/types';

export const mockGovernorates: LocationGovernorate[] = [
  {
    id: 'minya',
    name: 'المنيا',
    nameEn: 'Minya',
    cities: [
      {
        id: 'minya-new',
        name: 'المنيا الجديدة',
        nameEn: 'New Minya',
        areas: [
          { id: 'area-1', name: 'الحي الرابع - شارع النخيل', nameEn: '4th District - Al-Nakheel St.' },
          { id: 'area-2', name: 'الحي الأول - شارع المدارس', nameEn: '1st District - Schools St.' },
          { id: 'area-3', name: 'منطقة الـ 840 فدان', nameEn: '840 Feddan Area' },
          { id: 'area-4', name: 'منطقة النوادي والإسكان المميز', nameEn: 'Clubs & Premium Housing' },
        ],
      },
      {
        id: 'minya-city',
        name: 'مدينة المنيا (وسط البلد)',
        nameEn: 'Minya City Center',
        areas: [
          { id: 'area-5', name: 'كورنيش النيل', nameEn: 'Nile Corniche' },
          { id: 'area-6', name: 'حي شلبي والجامعة', nameEn: 'Shalaby & University District' },
          { id: 'area-7', name: 'ميدان بالاس وعمر بن الخطاب', nameEn: 'Palace Square' },
          { id: 'area-8', name: 'أرض سلطان', nameEn: 'Ard Sultan' },
        ],
      },
      {
        id: 'mallawi',
        name: 'ملوي',
        nameEn: 'Mallawi',
        areas: [
          { id: 'area-9', name: 'شارع الجلاء', nameEn: 'Al-Galaa St.' },
          { id: 'area-10', name: 'حي الروضة والمجيدي', nameEn: 'Al-Rawda & Al-Majeedi' },
        ],
      },
    ],
  },
  {
    id: 'cairo',
    name: 'القاهرة',
    nameEn: 'Cairo',
    cities: [
      {
        id: 'new-cairo',
        name: 'القاهرة الجديدة والتجمع',
        nameEn: 'New Cairo & 5th Settlement',
        areas: [
          { id: 'area-11', name: 'التجمع الخامس - شارع التسعين', nameEn: '5th Settlement - 90th St.' },
          { id: 'area-12', name: 'التجمع الأول - البنفسج والياسمين', nameEn: '1st Settlement' },
          { id: 'area-13', name: 'بيت الوطن والمستقبل', nameEn: 'Beit Al-Watan' },
        ],
      },
      {
        id: 'maadi',
        name: 'المعادي',
        nameEn: 'Maadi',
        areas: [
          { id: 'area-14', name: 'دجلة المعادي', nameEn: 'Degla Maadi' },
          { id: 'area-15', name: 'المعادي الجديدة', nameEn: 'New Maadi' },
          { id: 'area-16', name: 'الكورنيش وزهراء المعادي', nameEn: 'Zahraa El Maadi' },
        ],
      },
      {
        id: 'nasr-city',
        name: 'مدينة نصر',
        nameEn: 'Nasr City',
        areas: [
          { id: 'area-17', name: 'حي السفارات', nameEn: 'Embassies District' },
          { id: 'area-18', name: 'عباس العقاد ومكرم عبيد', nameEn: 'Abbas El-Akkad' },
        ],
      },
    ],
  },
  {
    id: 'giza',
    name: 'الجيزة',
    nameEn: 'Giza',
    cities: [
      {
        id: 'sheikh-zayed',
        name: 'الشيخ زايد',
        nameEn: 'Sheikh Zayed',
        areas: [
          { id: 'area-19', name: 'زايد ديونز والحي الدبلوماسي', nameEn: 'Zayed Dunes' },
          { id: 'area-20', name: 'بيفرلي هيلز', nameEn: 'Beverly Hills' },
        ],
      },
      {
        id: 'october',
        name: 'مدينة 6 أكتوبر',
        nameEn: '6th of October City',
        areas: [
          { id: 'area-21', name: 'الحي المتميز', nameEn: 'Distinctive District' },
          { id: 'area-22', name: 'غرب سوميد', nameEn: 'West Somid' },
        ],
      },
    ],
  },
];
