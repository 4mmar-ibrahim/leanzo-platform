import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export type AuditLogStatus = 'success' | 'warning' | 'failed' | 'critical';

export interface AuditFieldDiff {
  field: string;
  fieldLabelAr?: string;
  before: any;
  after: any;
}

export interface IAuditLog extends RepositoryRecord {
  // Actor info
  actorId: string;
  actorName: string;
  actorRole: string;
  adminId?: string; // Backward compatibility
  adminName?: string;
  adminRole?: string;

  // Operation info
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  description: string;
  status: AuditLogStatus;

  // Diff & State info
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: AuditFieldDiff[];

  // Technical & Network info
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  requestId?: string;

  // Backward-compatible fields
  target?: string;
  targetId?: string;
  details?: string;

  createdAt: Date;
}

export const AuditLog = createPrismaRepository('auditLog') as any;

