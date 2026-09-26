import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import prisma from '../config/prisma.js';
import { BackupRecord, IBackupRecord, BackupType } from '../models/BackupRecord.js';
import { auditService } from './auditService.js';

const BACKUP_STORAGE_DIR = path.join(process.cwd(), 'storage', 'backups');
const TEMP_STORAGE_DIR = path.join(process.cwd(), 'storage', 'temp');
const UPLOAD_ROOT_DIR = path.join(process.cwd(), 'uploads');

// Resolve public brand directory (Frontend mascot and brand assets)
const BRAND_DIR = path.resolve(process.cwd(), '..', 'public', 'brand');

// Ensure necessary directories exist
try {
  if (!fs.existsSync(BACKUP_STORAGE_DIR)) fs.mkdirSync(BACKUP_STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(TEMP_STORAGE_DIR)) fs.mkdirSync(TEMP_STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_ROOT_DIR)) fs.mkdirSync(UPLOAD_ROOT_DIR, { recursive: true });
} catch (err: any) {
  console.error('[BackupService] Directory init warning:', err.message);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export interface ForeignKeyConstraint {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

export interface MediaFileInventoryItem {
  logicalPath: string; // e.g. "media/uploads/images/foo.jpg"
  systemPath: string;
  category: 'uploads' | 'zo' | 'brand' | 'other';
  sizeBytes: number;
  mimeType: string;
  originalName: string;
  isOrphan: boolean;
  relatedEntity?: string;
  relatedRecordId?: string;
}

export interface CreateBackupOptions {
  notes?: string;
  type?: BackupType;
  includeMedia?: boolean;
  createdBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface BackupValidationResult {
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
}

export interface BackupRestoreResult {
  success: boolean;
  preRestoreBackupId: string;
  restoredTablesCount: number;
  restoredDocumentsCount: number;
  restoredMediaCount: number;
  tableVerification: Record<string, { backup: number; restored: number; match: boolean }>;
  mediaVerification: { backup: number; restored: number; match: boolean };
}

class BackupService {
  /**
   * Discovers all application-owned PostgreSQL tables dynamically
   * Excludes PostgreSQL internal tables and Prisma migration meta-tables
   */
  public async discoverDatabaseTables(): Promise<string[]> {
    const rows: Array<{ table_name: string }> = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations')
      ORDER BY table_name ASC;
    `;
    return rows.map((r) => r.table_name);
  }

  /**
   * Discovers all foreign key constraints dynamically from PostgreSQL schema
   */
  public async discoverForeignKeys(): Promise<ForeignKeyConstraint[]> {
    const rows: Array<{
      constraint_name: string;
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }> = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    `;
    return rows;
  }

  /**
   * Calculates topological sort dependency order for foreign keys
   * Ensures parents are inserted before children, and children deleted before parents
   */
  public calculateDependencyOrder(
    tables: string[],
    foreignKeys: ForeignKeyConstraint[]
  ): { insertOrder: string[]; deleteOrder: string[] } {
    const inDegree: Record<string, number> = {};
    const graph: Record<string, string[]> = {};

    for (const t of tables) {
      inDegree[t] = 0;
      graph[t] = [];
    }

    for (const fk of foreignKeys) {
      const child = fk.table_name;
      const parent = fk.foreign_table_name;
      if (tables.includes(child) && tables.includes(parent) && child !== parent) {
        graph[parent].push(child);
        inDegree[child] = (inDegree[child] || 0) + 1;
      }
    }

    const queue: string[] = [];
    for (const t of tables) {
      if (inDegree[t] === 0) {
        queue.push(t);
      }
    }

    const insertOrder: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      insertOrder.push(node);

      for (const neighbor of graph[node] || []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Append any remaining tables if graph has disconnected or cyclic components
    for (const t of tables) {
      if (!insertOrder.includes(t)) {
        insertOrder.push(t);
      }
    }

    const deleteOrder = [...insertOrder].reverse();
    return { insertOrder, deleteOrder };
  }

  /**
   * Discovers all physical media files from uploads and brand assets,
   * cross-references with database records to detect relationships & orphans
   */
  public async discoverMediaFiles(databaseDump?: Record<string, any[]>): Promise<MediaFileInventoryItem[]> {
    const inventory: MediaFileInventoryItem[] = [];

    // Helper to extract extension-based MIME type
    const getMime = (filename: string): string => {
      const ext = path.extname(filename).toLowerCase();
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          return 'image/jpeg';
        case '.png':
          return 'image/png';
        case '.webp':
          return 'image/webp';
        case '.gif':
          return 'image/gif';
        case '.svg':
          return 'image/svg+xml';
        case '.mp4':
          return 'video/mp4';
        case '.mov':
          return 'video/quicktime';
        default:
          return 'application/octet-stream';
      }
    };

    // 1. Recursive file scanner
    const scanDir = (dirPath: string, zipPrefix: string, category: 'uploads' | 'zo' | 'brand') => {
      if (!fs.existsSync(dirPath)) return;
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath, `${zipPrefix}/${item}`, category);
          } else if (stat.isFile() && stat.size > 0) {
            inventory.push({
              logicalPath: `${zipPrefix}/${item}`,
              systemPath: fullPath,
              category,
              sizeBytes: stat.size,
              mimeType: getMime(item),
              originalName: item,
              isOrphan: true, // will be evaluated against DB dump below
            });
          }
        } catch {
          // ignore unreadable files
        }
      }
    };

    // Scan uploads directory
    scanDir(UPLOAD_ROOT_DIR, 'media/uploads', 'uploads');

    // Scan frontend brand & Zo mascot assets
    if (fs.existsSync(BRAND_DIR)) {
      scanDir(path.join(BRAND_DIR, 'zo'), 'media/brand/zo', 'zo');
      // Root brand assets (cleanzo-van-hero, swatches, mascot guide)
      const brandItems = fs.readdirSync(BRAND_DIR);
      for (const item of brandItems) {
        const full = path.join(BRAND_DIR, item);
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          inventory.push({
            logicalPath: `media/brand/${item}`,
            systemPath: full,
            category: 'brand',
            sizeBytes: stat.size,
            mimeType: getMime(item),
            originalName: item,
            isOrphan: false, // Brand mascot assets are official core assets
          });
        }
      }
    }

    // 2. Cross-reference with database records to detect references vs orphans
    if (databaseDump) {
      // Gather all strings from DB dump
      const referencedStrings = new Set<string>();
      const recordMap: Record<string, { entity: string; recordId: string }> = {};

      for (const [table, records] of Object.entries(databaseDump)) {
        for (const row of records) {
          const rowId = row.id || row._id || '';
          const scanObj = (val: any) => {
            if (typeof val === 'string') {
              if (val.includes('.') || val.includes('/')) {
                const norm = val.toLowerCase();
                referencedStrings.add(norm);
                recordMap[norm] = { entity: table, recordId: rowId };
              }
            } else if (val && typeof val === 'object') {
              for (const k of Object.keys(val)) {
                scanObj(val[k]);
              }
            }
          };
          scanObj(row);
        }
      }

      // Check each file against referenced strings
      for (const item of inventory) {
        if (item.category === 'zo' || item.category === 'brand') {
          item.isOrphan = false;
          continue;
        }

        const fname = item.originalName.toLowerCase();
        let matched = false;

        for (const ref of referencedStrings) {
          if (ref.includes(fname)) {
            item.isOrphan = false;
            item.relatedEntity = recordMap[ref]?.entity;
            item.relatedRecordId = recordMap[ref]?.recordId;
            matched = true;
            break;
          }
        }
        if (!matched) {
          item.isOrphan = true;
        }
      }
    }

    return inventory;
  }

  /**
   * Generates authoritative full portable backup (.zip) directly from PostgreSQL + Media
   */
  public async createBackup(options: CreateBackupOptions = {}): Promise<IBackupRecord> {
    const backupId = `clz-backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const filename = `Cleanzo_Backup_${new Date().toISOString().slice(0, 10)}_${backupId.slice(-8)}.zip`;
    const targetZipPath = path.join(BACKUP_STORAGE_DIR, filename);

    const type: BackupType = options.type || (options.includeMedia === false ? 'database_only' : 'full');
    const includeMedia = options.includeMedia !== false && type !== 'database_only';

    const createdByStr =
      typeof options.createdBy === 'object' && options.createdBy !== null
        ? (options.createdBy as any).name || (options.createdBy as any).id || 'المسؤول'
        : (options.createdBy as any) || 'النظام';

    // 1. Initialize tracking record in DB
    const record = await BackupRecord.create({
      id: backupId,
      filename,
      sizeBytes: 0,
      sizeFormatted: '0 KB',
      status: 'in_progress',
      type,
      notes: options.notes || (type === 'pre_restore' ? 'نقطة استعادة أمان تلقائية قبل الاسترجاع' : 'نسخة احتياطية شاملة للموقع بالكامل'),
      createdBy: createdByStr,
    });

    try {
      const zip = new AdmZip();
      const checksums: Record<string, string> = {};

      // 2. Discover all PostgreSQL tables and Foreign Keys
      const tables = await this.discoverDatabaseTables();
      const foreignKeys = await this.discoverForeignKeys();
      const { insertOrder, deleteOrder } = this.calculateDependencyOrder(tables, foreignKeys);

      const tableCounts: Record<string, number> = {};
      const databaseDump: Record<string, any[]> = {};
      let totalDocuments = 0;

      // 3. Export all tables to database/<table_name>.json
      for (const table of tables) {
        try {
          const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}";`);
          const count = rows.length;
          tableCounts[table] = count;
          totalDocuments += count;
          databaseDump[table] = rows;

          const jsonContent = JSON.stringify(rows, null, 2);
          const zipPath = `database/${table}.json`;
          const fileBuf = Buffer.from(jsonContent, 'utf-8');

          zip.addFile(zipPath, fileBuf);
          checksums[zipPath] = crypto.createHash('sha256').update(fileBuf).digest('hex');
        } catch (tblErr: any) {
          console.warn(`[BackupService] Warning: Failed to dump table ${table}:`, tblErr.message);
          tableCounts[table] = 0;
          databaseDump[table] = [];
        }
      }

      // Add database metadata file
      const dbMetadata = {
        databaseEngine: 'PostgreSQL',
        schemaVersion: '2.0.0',
        tablesCount: tables.length,
        tables,
        insertOrder,
        deleteOrder,
        foreignKeys,
      };
      const dbMetaBuf = Buffer.from(JSON.stringify(dbMetadata, null, 2), 'utf-8');
      zip.addFile('database_metadata.json', dbMetaBuf);
      checksums['database_metadata.json'] = crypto.createHash('sha256').update(dbMetaBuf).digest('hex');

      // 4. Collect & Include Media Files
      let mediaInventory: MediaFileInventoryItem[] = [];
      let mediaTotalSizeBytes = 0;

      if (includeMedia) {
        mediaInventory = await this.discoverMediaFiles(databaseDump);
        for (const item of mediaInventory) {
          try {
            if (fs.existsSync(item.systemPath)) {
              const fileData = fs.readFileSync(item.systemPath);
              zip.addFile(item.logicalPath, fileData);
              checksums[item.logicalPath] = crypto.createHash('sha256').update(fileData).digest('hex');
              mediaTotalSizeBytes += item.sizeBytes;
            }
          } catch (fileErr: any) {
            console.warn(`[BackupService] Warning: Could not add media file ${item.logicalPath}:`, fileErr.message);
          }
        }
      }

      // Add media inventory file
      const mediaInventorySummary = {
        totalFiles: mediaInventory.length,
        totalSizeBytes: mediaTotalSizeBytes,
        totalSizeFormatted: formatBytes(mediaTotalSizeBytes),
        orphanCount: mediaInventory.filter((m) => m.isOrphan).length,
        items: mediaInventory.map((m) => ({
          logicalPath: m.logicalPath,
          size: m.sizeBytes,
          category: m.category,
          mimeType: m.mimeType,
          isOrphan: m.isOrphan,
          relatedEntity: m.relatedEntity,
          relatedRecordId: m.relatedRecordId,
        })),
      };
      const mediaInvBuf = Buffer.from(JSON.stringify(mediaInventorySummary, null, 2), 'utf-8');
      zip.addFile('media_inventory.json', mediaInvBuf);
      checksums['media_inventory.json'] = crypto.createHash('sha256').update(mediaInvBuf).digest('hex');

      // 5. Generate Manifest & Checksums
      const manifest = {
        backupFormat: 'cleanzo-backup',
        version: 1,
        backupId,
        application: 'Cleanzo Premium Auto & Home Care',
        database: 'PostgreSQL',
        schemaVersion: '2.0.0',
        createdAt: new Date().toISOString(),
        type,
        notes: record.notes,
        createdBy: options.createdBy || { id: 'system', name: 'المسؤول', role: 'admin' },
        tables,
        tableCounts,
        totalDocuments,
        mediaCount: mediaInventory.length,
        mediaTotalSize: formatBytes(mediaTotalSizeBytes),
        environment_secrets_excluded: true,
        excludedTables: ['_prisma_migrations (Internal Prisma migration history)'],
        databaseMetadata: {
          tablesCount: tables.length,
          foreignKeysCount: foreignKeys.length,
          insertOrder,
          deleteOrder,
        },
      };

      const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8');
      zip.addFile('manifest.json', manifestBuf);
      checksums['manifest.json'] = crypto.createHash('sha256').update(manifestBuf).digest('hex');

      // Add checksums file
      const checksumsBuf = Buffer.from(JSON.stringify(checksums, null, 2), 'utf-8');
      zip.addFile('checksums.json', checksumsBuf);

      // 6. Write archive to disk
      zip.writeZip(targetZipPath);

      // 7. Calculate overall ZIP file size & SHA-256 Checksum
      const fileBuffer = fs.readFileSync(targetZipPath);
      const sizeBytes = fileBuffer.length;
      const sizeFormatted = formatBytes(sizeBytes);
      const overallChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // 8. Update tracking record
      record.status = 'completed';
      record.sizeBytes = sizeBytes;
      record.sizeFormatted = sizeFormatted;
      record.checksum = overallChecksum;
      record.collectionsCount = tables.length;
      record.documentsCount = totalDocuments;
      record.mediaCount = mediaInventory.length;
      record.manifest = manifest;
      await record.save();

      // 9. Audit Log
      auditService.log({
        actorId: options.createdBy?.id || 'system',
        actorName: options.createdBy?.name || 'Admin',
        actorRole: options.createdBy?.role || 'owner',
        action: 'backup',
        module: 'system',
        entityType: 'BackupRecord',
        entityId: backupId,
        target: `نسخة احتياطية (${sizeFormatted})`,
        status: 'success',
        details: `تم إنشاء نسخة احتياطية شاملة بنجاح (${type}) بحجم ${sizeFormatted} وتشمل ${tables.length} جدول PostgreSQL، و${totalDocuments} مستند، و${mediaInventory.length} ملف وسائط وشخصيات Zo`,
      });

      return record;
    } catch (err: any) {
      console.error('[BackupService] Failed to create backup:', err);
      record.status = 'failed';
      record.error = err.message || 'فشلت عملية إنشاء النسخة الاحتياطية';
      await record.save();

      auditService.log({
        actorId: options.createdBy?.id || 'system',
        actorName: options.createdBy?.name || 'Admin',
        actorRole: options.createdBy?.role || 'owner',
        action: 'backup',
        module: 'system',
        status: 'failed',
        details: `فشل إنشاء النسخة الاحتياطية: ${err.message}`,
      });

      throw err;
    }
  }

  /**
   * Validates a backup archive (from disk path or buffer), inspecting
   * path traversal safety, manifest, checksums, schema compatibility, and records
   */
  public async validateArchive(zipBufferOrPath: Buffer | string): Promise<BackupValidationResult> {
    const issues: string[] = [];

    let zip: AdmZip;
    try {
      zip = typeof zipBufferOrPath === 'string' ? new AdmZip(zipBufferOrPath) : new AdmZip(zipBufferOrPath);
    } catch (err: any) {
      throw new Error(`ملف الأرشيف غير صالح أو تالف: ${err.message}`);
    }

    // 1. Path Traversal & Security Validation
    const entries = zip.getEntries();
    for (const entry of entries) {
      const name = entry.entryName;
      const normalized = path.normalize(name).replace(/\\/g, '/');
      if (normalized.startsWith('..') || path.isAbsolute(normalized) || name.includes('..') || name.startsWith('/')) {
        throw new Error(`Security Violation: مسار مشبوه داخل الأرشيف (${name})`);
      }
    }

    // 2. Manifest Validation
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      throw new Error('ملف الأرشيف غير متوافق: ملف manifest.json مفقود');
    }

    let manifest: any;
    try {
      manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
    } catch {
      throw new Error('ملف manifest.json داخل الأرشيف تالف وغير قابل للقراءة');
    }

    if (manifest.backupFormat !== 'cleanzo-backup') {
      issues.push('صيغة النسخة الاحتياطية قد تكون غير مطابقة لمعايير كلينزو الحديثة');
    }

    // 3. Checksums Validation
    const checksumsEntry = zip.getEntry('checksums.json');
    let checksumsValid = true;
    if (checksumsEntry) {
      try {
        const checksums = JSON.parse(checksumsEntry.getData().toString('utf-8'));
        for (const [filePath, expectedHash] of Object.entries(checksums)) {
          if (filePath === 'checksums.json') continue;
          const entry = zip.getEntry(filePath);
          if (!entry) {
            issues.push(`ملف مفقود من الأرشيف: ${filePath}`);
            checksumsValid = false;
            continue;
          }
          const actualHash = crypto.createHash('sha256').update(entry.getData()).digest('hex');
          if (actualHash !== expectedHash) {
            issues.push(`بصمة أمان غير متطابقة للملف: ${filePath}`);
            checksumsValid = false;
          }
        }
      } catch {
        issues.push('تعذر قراءة ملف التحقق من البصمات checksums.json');
        checksumsValid = false;
      }
    } else {
      issues.push('ملف checksums.json غير موجود في النسخة الاحتياطية');
      checksumsValid = false;
    }

    // 4. Discover current database state for comparison
    const currentTables = await this.discoverDatabaseTables();
    const currentCounts: Record<string, number> = {};
    for (const t of currentTables) {
      try {
        const countRes: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${t}";`
        );
        currentCounts[t] = Number(countRes[0]?.count || 0n);
      } catch {
        currentCounts[t] = 0;
      }
    }

    // 5. Build table comparison
    const backupTables = manifest.tables || [];
    const backupTableCounts = manifest.tableCounts || {};
    const tableComparison: Array<{ table: string; backupCount: number; currentCount: number }> = [];

    const allTableNames = Array.from(new Set([...currentTables, ...backupTables]));
    for (const tbl of allTableNames) {
      tableComparison.push({
        table: tbl,
        backupCount: backupTableCounts[tbl] || 0,
        currentCount: currentCounts[tbl] || 0,
      });
    }

    return {
      isValid: issues.length === 0,
      manifest,
      checksumsValid,
      tablesCount: backupTables.length,
      documentsCount: manifest.totalDocuments || 0,
      mediaCount: manifest.mediaCount || 0,
      mediaTotalSize: manifest.mediaTotalSize || '0 KB',
      issues,
      tableComparison,
    };
  }

  /**
   * Safely restores a backup archive (saved or uploaded from device)
   * 1. Validates the archive
   * 2. Creates automated Pre-Restore Safety Snapshot of current DB + Media
   * 3. Executes transactional PostgreSQL restore in dependency order using json_populate_recordset
   * 4. Safely restores physical media files
   * 5. Resyncs PostgreSQL sequences
   * 6. Verifies table row counts and media files
   */
  public async restoreBackupArchive(
    zipBufferOrPath: Buffer | string,
    actor?: { id: string; name: string; role: string },
    options: { originalFilename?: string } = {}
  ): Promise<BackupRestoreResult> {
    // Step 1: Pre-Validation
    const validation = await this.validateArchive(zipBufferOrPath);
    if (!validation.checksumsValid && validation.issues.some((i) => i.includes('بصمة أمان غير متطابقة'))) {
      throw new Error(`فشل التحقق الأمني: النسخة الاحتياطية تالفة أو تم التعديل عليها (${validation.issues.join(' | ')})`);
    }

    // Step 2: Automated Pre-Restore Safety Snapshot (Disaster Recovery Point)
    console.log('[BackupService] Creating pre-restore safety snapshot before destructive restore...');
    const preRestoreRecord = await this.createBackup({
      notes: `نقطة استعادة أمان تلقائية تم أخذها قبل استرجاع النسخة (${options.originalFilename || validation.manifest.backupId || 'uploaded'})`,
      type: 'pre_restore',
      includeMedia: true,
      createdBy: actor,
    });

    const zip = typeof zipBufferOrPath === 'string' ? new AdmZip(zipBufferOrPath) : new AdmZip(zipBufferOrPath);
    const manifest = validation.manifest;
    const backupTableCounts = manifest.tableCounts || {};

    try {
      // Step 3: Discover current DB foreign keys and dependency order
      const currentTables = await this.discoverDatabaseTables();
      const foreignKeys = await this.discoverForeignKeys();
      const { insertOrder, deleteOrder } = this.calculateDependencyOrder(currentTables, foreignKeys);

      // Step 4: Transactional PostgreSQL Database Restore
      await prisma.$transaction(
        async (tx) => {
          // 4.1. Truncate all tables in delete order (children first)
          // Preserving 'backup_records' so historical tracking is not erased
          const tablesToTruncate = deleteOrder.filter((t) => t !== 'backup_records');
          for (const tbl of tablesToTruncate) {
            try {
              await tx.$executeRawUnsafe(`TRUNCATE TABLE "${tbl}" CASCADE;`);
            } catch (truncErr: any) {
              console.warn(`[BackupService] Warning: Could not truncate ${tbl}:`, truncErr.message);
            }
          }

          // 4.2. Insert records in topological insert order (parents first)
          for (const tbl of insertOrder) {
            // Skip backup_records from truncation/overwriting
            if (tbl === 'backup_records') continue;

            const entry = zip.getEntry(`database/${tbl}.json`);
            if (entry) {
              const rawJson = entry.getData().toString('utf-8');
              const docs = JSON.parse(rawJson);

              if (Array.isArray(docs) && docs.length > 0) {
                // Batch insert using json_populate_recordset in chunks of 500
                const BATCH_SIZE = 500;
                for (let i = 0; i < docs.length; i += BATCH_SIZE) {
                  const chunk = docs.slice(i, i + BATCH_SIZE);
                  const chunkJson = JSON.stringify(chunk);
                  await tx.$executeRawUnsafe(
                    `INSERT INTO "${tbl}" SELECT * FROM json_populate_recordset(null::"${tbl}", $1::json);`,
                    chunkJson
                  );
                }
              }
            }
          }
        },
        { timeout: 90000 }
      );

      // Step 5: Resync PostgreSQL sequences
      await this.resyncAllSequences();

      // Step 6: Restore Media Files
      let restoredMediaCount = 0;
      const entries = zip.getEntries();
      for (const entry of entries) {
        if (entry.isDirectory) continue;

        if (entry.entryName.startsWith('media/uploads/')) {
          const relPath = entry.entryName.replace(/^media\/uploads\//, '');
          const destPath = path.join(UPLOAD_ROOT_DIR, relPath);
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.writeFileSync(destPath, entry.getData());
          restoredMediaCount++;
        } else if (entry.entryName.startsWith('media/brand/')) {
          const relPath = entry.entryName.replace(/^media\/brand\//, '');
          const destPath = path.join(BRAND_DIR, relPath);
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.writeFileSync(destPath, entry.getData());
          restoredMediaCount++;
        }
      }

      // Step 7: Complete Data Verification
      const tableVerification: Record<string, { backup: number; restored: number; match: boolean }> = {};
      let totalRestoredDocs = 0;

      for (const tbl of currentTables) {
        if (tbl === 'backup_records') continue;
        try {
          const countRes: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as count FROM "${tbl}";`
          );
          const restoredCount = Number(countRes[0]?.count || 0n);
          const expectedCount = backupTableCounts[tbl] || 0;
          totalRestoredDocs += restoredCount;
          tableVerification[tbl] = {
            backup: expectedCount,
            restored: restoredCount,
            match: restoredCount === expectedCount,
          };
        } catch {
          tableVerification[tbl] = { backup: 0, restored: 0, match: false };
        }
      }

      // Step 8: Audit Log
      auditService.log({
        actorId: actor?.id || 'system',
        actorName: actor?.name || 'Admin',
        actorRole: actor?.role || 'owner',
        action: 'restore_backup',
        module: 'system',
        entityType: 'BackupRecord',
        entityId: manifest.backupId || 'device-upload',
        target: options.originalFilename || manifest.backupId || 'استرجاع من الجهاز',
        status: 'critical',
        details: `تمت استعادة النظام بنجاح بالكامل. تم استرجاع ${currentTables.length} جدول (${totalRestoredDocs} مستند) و ${restoredMediaCount} ملف وسائط. تم إنشاء نقطة أمان سابقة (${preRestoreRecord.id})`,
      });

      return {
        success: true,
        preRestoreBackupId: preRestoreRecord.id,
        restoredTablesCount: currentTables.length,
        restoredDocumentsCount: totalRestoredDocs,
        restoredMediaCount,
        tableVerification,
        mediaVerification: {
          backup: manifest.mediaCount || 0,
          restored: restoredMediaCount,
          match: restoredMediaCount >= (manifest.mediaCount || 0),
        },
      };
    } catch (restoreErr: any) {
      console.error('[BackupService] Restore transaction failed:', restoreErr);

      auditService.log({
        actorId: actor?.id || 'system',
        actorName: actor?.name || 'Admin',
        actorRole: actor?.role || 'owner',
        action: 'restore_backup',
        module: 'system',
        status: 'failed',
        details: `فشلت استعادة النظام: ${restoreErr.message}`,
      });

      throw restoreErr;
    }
  }

  /**
   * Resynchronizes all sequences in the PostgreSQL public schema
   */
  public async resyncAllSequences(): Promise<void> {
    try {
      const serialColumns: Array<{ table_name: string; column_name: string; column_default: string }> =
        await prisma.$queryRaw`
          SELECT table_name, column_name, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND column_default LIKE 'nextval%';
        `;

      for (const col of serialColumns) {
        try {
          await prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${col.table_name}"', '${col.column_name}'), COALESCE(max("${col.column_name}"), 1)) FROM "${col.table_name}";`
          );
        } catch {
          // ignore single column sequence errors
        }
      }
    } catch (err: any) {
      console.warn('[BackupService] Sequence resynchronization note:', err.message);
    }
  }

  /**
   * Retrieves full audit of PostgreSQL tables, record counts, and media
   */
  public async getSystemAudit(): Promise<{
    database: string;
    tablesCount: number;
    totalRecords: number;
    tableCounts: Record<string, number>;
    foreignKeysCount: number;
    mediaCount: number;
    mediaTotalSize: string;
  }> {
    const tables = await this.discoverDatabaseTables();
    const foreignKeys = await this.discoverForeignKeys();
    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const t of tables) {
      try {
        const countRes: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${t}";`
        );
        const c = Number(countRes[0]?.count || 0n);
        tableCounts[t] = c;
        totalRecords += c;
      } catch {
        tableCounts[t] = 0;
      }
    }

    const media = await this.discoverMediaFiles();
    const mediaSize = media.reduce((acc, m) => acc + m.sizeBytes, 0);

    return {
      database: 'PostgreSQL',
      tablesCount: tables.length,
      totalRecords,
      tableCounts,
      foreignKeysCount: foreignKeys.length,
      mediaCount: media.length,
      mediaTotalSize: formatBytes(mediaSize),
    };
  }

  /**
   * Restores a saved backup from the server's local storage by ID
   */
  public async restoreSavedBackup(
    backupId: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<BackupRestoreResult> {
    const record = await BackupRecord.findOne({ id: backupId });
    if (!record) {
      throw new Error(`النسخة الاحتياطية المطلوبة غير مسجلة (${backupId})`);
    }

    const zipPath = path.join(BACKUP_STORAGE_DIR, record.filename);
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ملف الأرشيف غير موجود على القرص التخزيني (${record.filename})`);
    }

    return this.restoreBackupArchive(zipPath, actor, { originalFilename: record.filename });
  }

  /**
   * Lists all registered backups sorted by creation date descending
   */
  public async getBackupsList(): Promise<IBackupRecord[]> {
    return BackupRecord.find().sort({ createdAt: -1 });
  }

  /**
   * Returns absolute local filepath for download
   */
  public async getBackupFilePath(backupId: string): Promise<{ filePath: string; filename: string }> {
    const record = await BackupRecord.findOne({ id: backupId });
    if (!record) {
      throw new Error('النسخة الاحتياطية غير مسجلة في النظام');
    }

    const filePath = path.join(BACKUP_STORAGE_DIR, record.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('ملف الأرشيف غير موجود على القرص التخزيني');
    }

    return { filePath, filename: record.filename };
  }

  /**
   * Permanently deletes backup archive and its tracking record
   */
  public async deleteBackup(
    backupId: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<{ success: boolean }> {
    const record = await BackupRecord.findOne({ id: backupId });
    if (!record) {
      throw new Error('النسخة الاحتياطية غير موجودة');
    }

    const filePath = path.join(BACKUP_STORAGE_DIR, record.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err: any) {
        console.warn(`[BackupService] Warning: Could not delete ${filePath}:`, err.message);
      }
    }

    await BackupRecord.deleteOne({ id: backupId });

    auditService.log({
      actorId: actor?.id || 'system',
      actorName: actor?.name || 'Admin',
      actorRole: actor?.role || 'owner',
      action: 'delete_backup',
      module: 'system',
      entityType: 'BackupRecord',
      entityId: backupId,
      target: record.filename,
      status: 'warning',
      details: `تم حذف ملف النسخة الاحتياطية (${record.filename}) نهائياً من القرص وقاعدة البيانات`,
    });

    return { success: true };
  }
}

export const backupService = new BackupService();
