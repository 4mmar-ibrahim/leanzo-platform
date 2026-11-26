import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface ITechnician extends RepositoryRecord {
  id: string; // e.g. 'tech-1'
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  rating: number;
  specialty: string;
  specialtiesList: string[];
  status: 'available' | 'busy' | 'offline';
  active: boolean;
  completedOrders: number;
  assignedOrders: number;
  bio?: string;
  nationalId?: string;
  joinedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const Technician = createPrismaRepository('technician') as any;
