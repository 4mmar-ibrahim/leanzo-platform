import { connectDB, disconnectDB } from '../src/config/db.js';
import { Role } from '../src/models/Role.js';

async function seedSystemDefaults() {
  console.log('🌱 Initializing Cleanzo essential system configuration...');
  await connectDB();

  const count = await Role.countDocuments();
  if (count === 0) {
    console.log('-> Creating base RBAC roles...');
    await Role.create([
      {
        id: 'owner',
        name: 'Owner',
        nameAr: 'المالك',
        description: 'Full unrestricted access to all Cleanzo systems',
        descriptionAr: 'صلاحيات كاملة وغير مقيدة على جميع أقسام كلينزو',
        permissions: {},
        isSystem: true,
      },
      {
        id: 'admin',
        name: 'General Administrator',
        nameAr: 'مدير عام',
        description: 'Manage operations, orders, customers, and services',
        descriptionAr: 'إدارة العمليات والطلبات والعملاء والخدمات',
        permissions: {
          dashboard: ['view', 'manage'],
          customers: ['view', 'create', 'edit'],
          orders: ['view', 'create', 'edit', 'assign'],
          services: ['view', 'create', 'edit'],
          offers: ['view', 'create', 'edit'],
          coupons: ['view', 'create', 'edit', 'delete'],
          gallery: ['view', 'create', 'edit'],
          content: ['view', 'create', 'edit'],
          locations: ['view', 'create', 'edit'],
          technicians: ['view', 'create', 'edit', 'assign'],
          reports: ['view'],
          analytics: ['view'],
          notifications: ['view', 'create'],
          zo: ['view', 'edit', 'publish'],
          settings: ['view'],
        },
        isSystem: true,
      },
      {
        id: 'technician',
        name: 'Service Technician',
        nameAr: 'فني خدمة',
        description: 'Access to assigned bookings and status updates',
        descriptionAr: 'الوصول إلى الحجوزات المسندة إليه وتحديث حالتها',
        permissions: {
          dashboard: ['view'],
          orders: ['view', 'edit'],
        },
        isSystem: true,
      },
    ]);
    console.log('✅ Base roles established.');
  } else {
    console.log(`ℹ️ System roles already initialized (${count} roles present).`);
  }

  await disconnectDB();
  console.log('✨ System initialization complete.');
}

seedSystemDefaults().catch((err) => {
  console.error('Failed to initialize system defaults:', err);
  process.exit(1);
});
