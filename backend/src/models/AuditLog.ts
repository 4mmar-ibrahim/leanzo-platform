import mongoose, { Schema, Document } from 'mongoose';

export type AuditLogStatus = 'success' | 'warning' | 'failed' | 'critical';

export interface AuditFieldDiff {
  field: string;
  fieldLabelAr?: string;
  before: any;
  after: any;
}

export interface IAuditLog extends Document {
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

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true, index: true },
    adminId: { type: String },
    adminName: { type: String },
    adminRole: { type: String },

    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['success', 'warning', 'failed', 'critical'],
      default: 'success',
      index: true,
    },

    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    diff: { type: [Schema.Types.Mixed], default: [] },

    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    requestId: { type: String, index: true },

    target: { type: String },
    targetId: { type: String },
    details: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.pre('validate', function (next) {
  if (!this.actorId && this.adminId) this.actorId = this.adminId;
  if (!this.actorId) this.actorId = 'system';
  if (!this.actorName && this.adminName) this.actorName = this.adminName;
  if (!this.actorName) this.actorName = 'مشرف النظام';
  if (!this.actorRole && this.adminRole) this.actorRole = this.adminRole;
  if (!this.actorRole) this.actorRole = 'admin';
  if (!this.description) this.description = this.details || `${this.actorName}: ${this.action} (${this.target || this.module})`;
  if (!this.status) this.status = 'success';
  next();
});

// Compound and search indexes for high performance queries
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ module: 1, action: 1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

import { createPrismaRepository } from './prismaModelBridge.js';
export const AuditLog = createPrismaRepository('auditLog') as any;

