import prisma from '../config/prisma.js';
import { randomUUID } from 'node:crypto';

/**
 * Translates Mongoose-style query filters to Prisma 'where' input
 */
export function translateFilter(filter: any = {}, modelName?: string): any {
  if (!filter || typeof filter !== 'object') return {};

  const where: any = {};

  for (const key of Object.keys(filter)) {
    const val = filter[key];

    // Handle $or and $and
    if (key === '$or' && Array.isArray(val)) {
      const branches = val
        .map((v: any) => translateFilter(v, modelName))
        .filter((branch: any) => {
          if (!branch || typeof branch !== 'object') return false;
          if (branch.id === null || branch.id === undefined) {
            delete branch.id;
          }
          return Object.keys(branch).length > 0;
        });
      if (branches.length === 1) {
        Object.assign(where, branches[0]);
      } else if (branches.length > 1) {
        where.OR = branches;
      }
      continue;
    }
    if (key === '$and' && Array.isArray(val)) {
      where.AND = val.map((v: any) => translateFilter(v, modelName)).filter((b: any) => b && Object.keys(b).length > 0);
      continue;
    }

    if (key === '$expr') {
      continue;
    }

    // Handle _id or id
    const targetKey = key === '_id' ? 'id' : key;

    // Prisma User model (customers) has no 'role' field
    if (modelName === 'user' && (targetKey === 'role' || targetKey === 'roleId')) {
      continue;
    }

    if (val === undefined) {
      continue;
    }

    if (targetKey === 'id' && val === null) {
      continue;
    }

    // Handle JSON nested path e.g. "couponSnapshot.couponCode"
    if (targetKey.includes('.')) {
      const parts = targetKey.split('.');
      const rootField = parts[0];
      const jsonPath = parts.slice(1);
      where[rootField] = {
        path: jsonPath,
        equals: val,
      };
      continue;
    }

    if (val === null || val === undefined) {
      where[targetKey] = val;
    } else if (val instanceof RegExp) {
      where[targetKey] = {
        contains: val.source.replace(/^\^|\$$/g, ''),
        mode: val.flags.includes('i') ? 'insensitive' : 'default',
      };
    } else if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      // Operator object e.g. { $ne: 'cancelled' }, { $in: [...] }, { $regex: '...', $options: 'i' }
      const ops = Object.keys(val);
      if (ops.includes('$exists')) {
        if (val.$exists) {
          where[targetKey] = { not: null };
        } else {
          where[targetKey] = null;
        }
      } else if (ops.includes('$ne')) {
        where[targetKey] = { not: val.$ne };
      } else if (ops.includes('$in')) {
        where[targetKey] = { in: val.$in };
      } else if (ops.includes('$nin')) {
        where[targetKey] = { notIn: val.$nin };
      } else if (ops.includes('$regex')) {
        const pattern = val.$regex instanceof RegExp ? val.$regex.source : String(val.$regex);
        const flags = val.$regex instanceof RegExp ? val.$regex.flags : (val.$options || '');
        where[targetKey] = {
          contains: pattern.replace(/^\^|\$$/g, ''),
          mode: flags.includes('i') ? 'insensitive' : 'default',
        };
      } else if (ops.includes('$gte') || ops.includes('$lte') || ops.includes('$gt') || ops.includes('$lt')) {
        where[targetKey] = {};
        if (val.$gte !== undefined) where[targetKey].gte = val.$gte;
        if (val.$lte !== undefined) where[targetKey].lte = val.$lte;
        if (val.$gt !== undefined) where[targetKey].gt = val.$gt;
        if (val.$lt !== undefined) where[targetKey].lt = val.$lt;
      } else {
        where[targetKey] = val;
      }
    } else {
      where[targetKey] = val;
    }
  }

  if (modelName === 'customerAddress' && where.userId !== undefined && where.customerId === undefined) {
    where.customerId = where.userId;
    delete where.userId;
  }

  return where;
}

/**
 * Creates a chainable Query object compatible with Mongoose query chaining (.sort, .limit, .skip, .lean, .select)
 */
export class ChainablePrismaQuery<T = any> implements PromiseLike<T> {
  private prismaDelegate: any;
  private where: any;
  private isFindOne: boolean;
  private orderBy?: any;
  private take?: number;
  private skipCount?: number;

  constructor(prismaDelegate: any, filter: any = {}, isFindOne = false, modelName?: string) {
    this.prismaDelegate = prismaDelegate;
    this.where = translateFilter(filter, modelName);
    if (modelName === 'user' && this.where && this.where.role !== undefined) {
      delete this.where.role;
    }
    this.isFindOne = isFindOne;
  }

  sort(arg: any) {
    if (typeof arg === 'string') {
      const desc = arg.startsWith('-');
      const field = desc ? arg.slice(1) : arg;
      this.orderBy = { [field]: desc ? 'desc' : 'asc' };
    } else if (arg && typeof arg === 'object') {
      const entries = Object.entries(arg);
      if (entries.length === 1) {
        const [field, dir] = entries[0];
        this.orderBy = { [field]: dir === -1 || dir === 'desc' ? 'desc' : 'asc' };
      } else if (entries.length > 1) {
        this.orderBy = entries.map(([field, dir]) => ({
          [field]: dir === -1 || dir === 'desc' ? 'desc' : 'asc',
        }));
      }
    }
    return this;
  }

  limit(n: number) {
    this.take = n;
    return this;
  }

  skip(n: number) {
    this.skipCount = n;
    return this;
  }

  select(_fields: any) {
    return this;
  }

  lean() {
    return this;
  }

  async exec(): Promise<T> {
    if (this.isFindOne) {
      const res = await this.prismaDelegate.findFirst({
        where: this.where,
        orderBy: this.orderBy,
      });
      return attachDocHelpers(res, this.prismaDelegate);
    }

    const args: any = { where: this.where };
    if (this.orderBy) args.orderBy = this.orderBy;
    if (this.take !== undefined) args.take = this.take;
    if (this.skipCount !== undefined) args.skip = this.skipCount;

    const list = await this.prismaDelegate.findMany(args);
    return list.map((doc: any) => attachDocHelpers(doc, this.prismaDelegate));
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

/**
 * Creates a Prisma-backed repository that replaces a Mongoose model
 */
import bcrypt from 'bcryptjs';

function attachDocHelpers(doc: any, delegate?: any) {
  if (!doc || typeof doc !== 'object') return doc;
  if (!doc._id && doc.id) {
    doc._id = doc.id;
  }
  if (doc._id && !doc.id) {
    doc.id = doc._id;
  }
  if (doc.password && !doc.comparePassword) {
    doc.comparePassword = async function (candidate: string) {
      if (!this.password) return false;
      if (this.password === candidate) return true;
      try {
        return await bcrypt.compare(candidate, this.password);
      } catch {
        return false;
      }
    };
  }
  if (doc.metadata && typeof doc.metadata === 'object') {
    if (doc.metadata.cancelledAt && !doc.cancelledAt) {
      doc.cancelledAt = new Date(doc.metadata.cancelledAt);
    }
    if (doc.metadata.cancellationSource && !doc.cancellationSource) {
      doc.cancellationSource = doc.metadata.cancellationSource;
    }
    if (doc.metadata.cancellationReason && !doc.cancellationReason) {
      doc.cancellationReason = doc.metadata.cancellationReason;
    }
  }
  if (!doc.save && delegate) {
    doc.save = async function () {
      const targetId = this.id || this._id;
      const data: any = {};
      for (const k of Object.keys(this)) {
        if (['id', '_id', 'save', 'comparePassword', 'toObject', 'toJSON', 'markModified', '__v'].includes(k)) continue;
        if (typeof this[k] === 'function') continue;
        if (this[k] === undefined) continue;
        data[k] = this[k];
      }
      if (data.createdBy && typeof data.createdBy === 'object') {
        data.createdBy = data.createdBy.name || data.createdBy.id || 'admin';
      }
      if (data.password && !data.password.startsWith('$2a$') && !data.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
        this.password = data.password;
      }
      if (data.customerId !== undefined) {
        if (data.customerId) {
          data.user = { connect: { id: data.customerId } };
        }
        delete data.customerId;
      }
      if (data.service !== undefined) {
        delete data.service;
      }
      if (data.cancelledAt || data.cancellationSource || data.cancellationReason) {
        data.metadata = {
          ...(data.metadata || {}),
          ...(data.cancelledAt ? { cancelledAt: data.cancelledAt } : {}),
          ...(data.cancellationSource ? { cancellationSource: data.cancellationSource } : {}),
          ...(data.cancellationReason ? { cancellationReason: data.cancellationReason } : {}),
        };
        delete data.cancelledAt;
        delete data.cancellationSource;
        delete data.cancellationReason;
      }
      const updated = await delegate.update({
        where: { id: targetId },
        data,
      });
      return attachDocHelpers(updated, delegate);
    };
  }
  if (!doc.toObject) {
    doc.toObject = function () {
      return { ...this };
    };
  }
  if (!doc.toJSON) {
    doc.toJSON = function () {
      return { ...this };
    };
  }
  if (!doc.markModified) {
    doc.markModified = function () {};
  }
  if (!doc.getComputedStatus && (doc.totalUsageLimit !== undefined || doc.code)) {
    doc.getComputedStatus = function () {
      if (this.isArchived || this.status === 'inactive') return 'inactive';
      const today = new Date().toISOString().split('T')[0];
      if (this.endDate && today > this.endDate) return 'expired';
      if (this.currentUsageCount !== undefined && this.totalUsageLimit !== undefined && this.currentUsageCount >= this.totalUsageLimit) return 'exhausted';
      return 'active';
    };
  }
  return doc;
}

function expandDotNotation(data: any): any {
  if (!data || typeof data !== 'object' || data instanceof Date) return data;
  const result: any = {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (key.includes('.')) {
      const parts = key.split('.');
      let curr = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!curr[part] || typeof curr[part] !== 'object' || Array.isArray(curr[part]) || curr[part] instanceof Date) {
          curr[part] = {};
        }
        curr = curr[part];
      }
      curr[parts[parts.length - 1]] = val;
    } else {
      if (
        result[key] &&
        typeof result[key] === 'object' &&
        !(result[key] instanceof Date) &&
        typeof val === 'object' &&
        !(val instanceof Date) &&
        !Array.isArray(val) &&
        !Array.isArray(result[key])
      ) {
        result[key] = { ...result[key], ...val };
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

export function createPrismaRepository(prismaDelegateName: keyof typeof prisma) {
  const delegate = prisma[prismaDelegateName] as any;
  const modelName = prismaDelegateName as string;

  return {
    find(filter?: any) {
      return new ChainablePrismaQuery(delegate, filter, false, modelName);
    },

    findOne(filter?: any) {
      const q = new ChainablePrismaQuery(delegate, filter, true, modelName);
      const origExec = q.exec.bind(q);
      q.exec = async () => {
        const res = await origExec();
        return attachDocHelpers(res, delegate);
      };
      return q;
    },

    findById(id: string) {
      return this.findOne({ id });
    },

    async create(data: any): Promise<any> {
      if (Array.isArray(data)) {
        return Promise.all(data.map((item) => this.create(item)));
      }

      const cleanData = { ...data };
      if (cleanData._id && !cleanData.id) {
        cleanData.id = cleanData._id.toString();
      }
      delete cleanData._id;
      delete cleanData.__v;
      for (const k of Object.keys(cleanData)) {
        if (cleanData[k] === undefined) {
          delete cleanData[k];
        }
      }

      if (!cleanData.actorId && cleanData.adminId) cleanData.actorId = cleanData.adminId;
      if (!cleanData.actorName && cleanData.adminName) cleanData.actorName = cleanData.adminName;
      if (!cleanData.actorRole && cleanData.adminRole) cleanData.actorRole = cleanData.adminRole;
      if (!cleanData.description && prismaDelegateName === 'auditLog') cleanData.description = cleanData.action || 'System action';

      if (prismaDelegateName === 'backupRecord') {
        if (cleanData.sizeBytes === undefined || cleanData.sizeBytes === null) cleanData.sizeBytes = 0;
        if (cleanData.sizeFormatted === undefined || cleanData.sizeFormatted === null) cleanData.sizeFormatted = '0 KB';
        if (cleanData.createdBy && typeof cleanData.createdBy === 'object') {
          cleanData.createdBy = cleanData.createdBy.name || cleanData.createdBy.id || 'admin';
        }
      }

      if (cleanData.passwordHash !== undefined) {
        delete cleanData.passwordHash;
      }

      if (modelName === 'user' && cleanData.role !== undefined) {
        delete cleanData.role;
      }

      if (modelName === 'customerAddress' && cleanData.userId !== undefined && cleanData.customerId === undefined) {
        cleanData.customerId = cleanData.userId;
        delete cleanData.userId;
      }

      if (modelName === 'service') {
        const sDur = cleanData.serviceDurationMinutes ?? cleanData.duration ?? 60;
        const tDur = cleanData.travelTimeMinutes ?? 0;
        if (cleanData.totalOccupiedMinutes === undefined) {
          cleanData.totalOccupiedMinutes = sDur + tDur;
        }
      }

      if (modelName === 'technician') {
        if (cleanData.role !== undefined) delete cleanData.role;
        if (cleanData.isAvailable !== undefined) {
          if (cleanData.active === undefined) cleanData.active = cleanData.isAvailable;
          delete cleanData.isAvailable;
        }
        if (cleanData.activeOrdersCount !== undefined) {
          if (cleanData.assignedOrders === undefined) cleanData.assignedOrders = cleanData.activeOrdersCount;
          delete cleanData.activeOrdersCount;
        }
        if (cleanData.specialties !== undefined) {
          if (!cleanData.specialtiesList) cleanData.specialtiesList = cleanData.specialties;
          delete cleanData.specialties;
        }
      }

      if (modelName === 'booking') {
        if (cleanData.service !== undefined) delete cleanData.service;
        if (!cleanData.timeSlotStart) {
          cleanData.timeSlotStart = cleanData.scheduledStart || cleanData.time || '09:00';
        }
        if (cleanData.cancelledAt || cleanData.cancellationSource || cleanData.cancellationReason) {
          cleanData.metadata = {
            ...(cleanData.metadata || {}),
            ...(cleanData.cancelledAt ? { cancelledAt: cleanData.cancelledAt } : {}),
            ...(cleanData.cancellationSource ? { cancellationSource: cleanData.cancellationSource } : {}),
            ...(cleanData.cancellationReason ? { cancellationReason: cleanData.cancellationReason } : {}),
          };
          delete cleanData.cancelledAt;
          delete cleanData.cancellationSource;
          delete cleanData.cancellationReason;
        }
      }

      if (modelName === 'serviceCategory') {
        if (!cleanData.id) {
          cleanData.id = cleanData.slug ? cleanData.slug.toLowerCase().trim() : randomUUID();
        }
        if (!cleanData.nameEn) {
          cleanData.nameEn = cleanData.name || cleanData.slug || 'Category';
        }
        if (cleanData.order === undefined) {
          cleanData.order = 0;
        }
        if (cleanData.active === undefined) {
          cleanData.active = true;
        }
        const allowed = new Set([
          'id', 'name', 'nameEn', 'slug', 'icon', 'image',
          'description', 'descriptionEn', 'category', 'order', 'active',
          'createdAt', 'updatedAt'
        ]);
        for (const k of Object.keys(cleanData)) {
          if (!allowed.has(k)) delete cleanData[k];
        }
      }

      if (modelName === 'service') {
        const allowed = new Set([
          'id', 'category', 'subCategory', 'title', 'titleEn',
          'shortDescription', 'shortDescriptionEn', 'description', 'descriptionEn',
          'image', 'price', 'basePrice', 'originalPrice', 'duration',
          'serviceDurationMinutes', 'travelTimeMinutes', 'totalOccupiedMinutes',
          'rating', 'reviewCount', 'popular', 'available', 'active',
          'isArchived', 'discount', 'features', 'featuresEn',
          'inclusions', 'inclusionsEn', 'importantNotes', 'importantNotesEn',
          'order', 'createdAt', 'updatedAt'
        ]);
        for (const k of Object.keys(cleanData)) {
          if (!allowed.has(k)) delete cleanData[k];
        }
      }

      if (modelName === 'locationGovernorate') {
        if (!cleanData.id) {
          cleanData.id = cleanData.slug || randomUUID();
        }
      }

      // Hash password if raw string is provided
      if (
        cleanData.password &&
        !cleanData.password.startsWith('$2a$') &&
        !cleanData.password.startsWith('$2b$')
      ) {
        const salt = await bcrypt.genSalt(10);
        cleanData.password = await bcrypt.hash(cleanData.password, salt);
      }

      const res = await delegate.create({ data: cleanData });
      return attachDocHelpers(res, delegate);
    },

    async insertMany(docs: any[]): Promise<any[]> {
      if (!Array.isArray(docs)) {
        return [await this.create(docs)];
      }
      const results: any[] = [];
      for (const item of docs) {
        results.push(await this.create(item));
      }
      return results;
    },

    async updateOne(filter: any, update: any) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      let data = update;
      if (update.$set) data = { ...update.$set };
      if (update.$inc) {
        for (const k of Object.keys(update.$inc)) {
          data[k] = { increment: update.$inc[k] };
        }
      }
      delete data.$set;
      delete data.$inc;
      delete data._id;
      delete data.__v;
      for (const k of Object.keys(data)) {
        if (data[k] === undefined) delete data[k];
      }

      data = expandDotNotation(data);

      if (prismaDelegateName === 'backupRecord' && data.createdBy && typeof data.createdBy === 'object') {
        data.createdBy = data.createdBy.name || data.createdBy.id || 'admin';
      }

      if (modelName === 'serviceCategory') {
        const allowed = new Set([
          'id', 'name', 'nameEn', 'slug', 'icon', 'image',
          'description', 'descriptionEn', 'category', 'order', 'active',
          'createdAt', 'updatedAt'
        ]);
        for (const k of Object.keys(data)) {
          if (!allowed.has(k)) delete data[k];
        }
      }

      return delegate.updateMany({
        where,
        data,
      });
    },

    async updateMany(filter: any, update: any) {
      return this.updateOne(filter, update);
    },

    async findOneAndUpdate(filter: any, update: any, options: any = {}) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      let data = { ...update };
      if (update.$set) data = { ...data, ...update.$set };
      if (update.$inc) {
        for (const k of Object.keys(update.$inc)) {
          data[k] = { increment: update.$inc[k] };
        }
      }
      delete data.$set;
      delete data.$inc;
      delete data._id;
      delete data.__v;
      for (const k of Object.keys(data)) {
        if (data[k] === undefined) delete data[k];
      }

      data = expandDotNotation(data);

      if (prismaDelegateName === 'backupRecord' && data.createdBy && typeof data.createdBy === 'object') {
        data.createdBy = data.createdBy.name || data.createdBy.id || 'admin';
      }

      if (modelName === 'booking') {
        if (data.customerId !== undefined) {
          if (data.customerId) {
            data.user = { connect: { id: data.customerId } };
          }
          delete data.customerId;
        }
        if (data.service !== undefined) {
          delete data.service;
        }
        if (data.cancelledAt || data.cancellationSource || data.cancellationReason) {
          data.metadata = {
            ...(data.metadata || {}),
            ...(data.cancelledAt ? { cancelledAt: data.cancelledAt } : {}),
            ...(data.cancellationSource ? { cancellationSource: data.cancellationSource } : {}),
            ...(data.cancellationReason ? { cancellationReason: data.cancellationReason } : {}),
          };
          delete data.cancelledAt;
          delete data.cancellationSource;
          delete data.cancellationReason;
        }
      }

      if (modelName === 'serviceCategory') {
        const allowed = new Set([
          'id', 'name', 'nameEn', 'slug', 'icon', 'image',
          'description', 'descriptionEn', 'category', 'order', 'active',
          'createdAt', 'updatedAt'
        ]);
        for (const k of Object.keys(data)) {
          if (!allowed.has(k)) delete data[k];
        }
      }

      if (modelName === 'service') {
        const allowed = new Set([
          'id', 'category', 'subCategory', 'title', 'titleEn',
          'shortDescription', 'shortDescriptionEn', 'description', 'descriptionEn',
          'image', 'price', 'basePrice', 'originalPrice', 'duration',
          'serviceDurationMinutes', 'travelTimeMinutes', 'totalOccupiedMinutes',
          'rating', 'reviewCount', 'popular', 'available', 'active',
          'isArchived', 'discount', 'features', 'featuresEn',
          'inclusions', 'inclusionsEn', 'importantNotes', 'importantNotesEn',
          'order', 'createdAt', 'updatedAt'
        ]);
        for (const k of Object.keys(data)) {
          if (!allowed.has(k)) delete data[k];
        }
      }

      if (options.upsert) {
        const existing = await delegate.findFirst({ where });
        if (existing) {
          const res = await delegate.update({
            where: { id: existing.id },
            data,
          });
          return attachDocHelpers(res, delegate);
        }
        const res = await delegate.create({
          data: { ...where, ...data },
        });
        return attachDocHelpers(res, delegate);
      }

      const existing = await delegate.findFirst({ where });
      if (!existing) return null;

      // Merge nested objects if existing record already has them
      for (const k of Object.keys(data)) {
        if (
          existing[k] &&
          typeof existing[k] === 'object' &&
          !(existing[k] instanceof Date) &&
          !Array.isArray(existing[k]) &&
          data[k] &&
          typeof data[k] === 'object' &&
          !(data[k] instanceof Date) &&
          !Array.isArray(data[k])
        ) {
          data[k] = { ...existing[k], ...data[k] };
        }
      }

      if (filter && filter.$expr) {
        if (filter.$expr.$lt && Array.isArray(filter.$expr.$lt)) {
          const [f1, f2] = filter.$expr.$lt;
          const k1 = typeof f1 === 'string' ? f1.replace('$', '') : null;
          const k2 = typeof f2 === 'string' ? f2.replace('$', '') : null;
          const val1 = k1 ? existing[k1] : f1;
          const val2 = k2 ? existing[k2] : f2;
          if (val1 >= val2) return null;
        }
      }

      const res = await delegate.update({
        where: { id: existing.id },
        data,
      });
      return attachDocHelpers(res, delegate);
    },

    async findByIdAndUpdate(id: string, update: any, options: any = {}) {
      return this.findOneAndUpdate({ id }, update, options);
    },

    async findByIdAndDelete(id: string) {
      return this.findOneAndDelete({ id });
    },

    async findOneAndDelete(filter: any) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      const record = await delegate.findFirst({ where });
      if (record) {
        await delegate.delete({ where: { id: record.id } });
        return attachDocHelpers(record, delegate);
      }
      return null;
    },

    async deleteOne(filter: any) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      const record = await delegate.findFirst({ where });
      if (record) {
        await delegate.delete({ where: { id: record.id } });
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },

    async deleteMany(filter: any) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      const result = await delegate.deleteMany({ where });
      return { deletedCount: result.count };
    },

    async countDocuments(filter: any = {}) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      return delegate.count({ where });
    },

    async exists(filter: any) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      const record = await delegate.findFirst({ where, select: { id: true } });
      return record ? { _id: record.id } : null;
    },

    async distinct(field: string, filter: any = {}) {
      const where = translateFilter(filter, modelName);
      if (modelName === 'user' && where.role !== undefined) delete where.role;
      const rows = await delegate.findMany({
        where,
        distinct: [field],
        select: { [field]: true },
      });
      return rows.map((r: any) => r[field]).filter((v: any) => v !== undefined && v !== null);
    },

    aggregate: async (pipeline: any[]) => {
      // Fallback for aggregations
      return [];
    },
  };
}
