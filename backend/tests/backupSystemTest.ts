import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { AdminUser } from '../src/models/AdminUser.js';
import { BackupRecord } from '../src/models/BackupRecord.js';
import { Service } from '../src/models/Service.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;
let ownerUser: any;
let operatorToken: string;
let operatorUser: any;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders; rawBuffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'User-Agent': 'CleanzoBackupTest/1.0',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload: string | undefined;
    if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const rawBuffer = Buffer.concat(chunks);
          let parsed: any;
          try {
            parsed = JSON.parse(rawBuffer.toString('utf-8'));
          } catch {
            parsed = { rawLength: rawBuffer.length };
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers, rawBuffer });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runBackupSystemTests() {
  console.log('================================================================');
  console.log('🚀 CLEANZO — TASK 09: BACKUP & DISASTER RECOVERY TEST SUITE');
  console.log('================================================================\n');

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    console.log(`📡 Test server running on: ${baseUrl}\n`);

    // Setup Test Users
    ownerUser = await AdminUser.findOne({ role: 'owner' });
    if (!ownerUser) {
      ownerUser = await AdminUser.create({
        name: 'م. أحمد الشريف (المالك)',
        username: 'backup-owner@cleanzo.app',
        email: 'backup-owner@cleanzo.app',
        password: 'BackupOwnerPass@123',
        phone: '01009998877',
        role: 'owner',
        status: 'active',
      });
    }
    ownerToken = generateAdminToken({
      id: ownerUser._id.toString(),
      username: ownerUser.username,
      role: ownerUser.role,
    });

    operatorUser = await AdminUser.findOne({ role: 'operator' });
    if (!operatorUser) {
      operatorUser = await AdminUser.create({
        name: 'علي المشغل (مشغل محدود)',
        username: 'backup-op@cleanzo.app',
        email: 'backup-op@cleanzo.app',
        password: 'BackupOpPass@123',
        phone: '01001112233',
        role: 'operator',
        status: 'active',
      });
    }
    operatorToken = generateAdminToken({
      id: operatorUser._id.toString(),
      username: operatorUser.username,
      role: operatorUser.role,
    });

    console.log('----------------------------------------------------------------');
    console.log('TEST 1: Create Full Backup with MongoDB Collections & Checksum');
    console.log('----------------------------------------------------------------');

    // Ensure at least one test service exists
    let testService = await Service.findOne({ id: 'test-backup-service' });
    if (!testService) {
      testService = await Service.create({
        id: 'test-backup-service',
        title: 'خدمة تجربة النسخ الاحتياطي',
        titleEn: 'Backup Test Service',
        category: 'car',
        image: '/images/test-service.png',
        price: 350,
        available: true,
      });
    }

    const createRes = await makeRequest(
      'POST',
      '/admin/backups',
      {
        notes: 'اختبار النسخ الاحتياطي الشامل المؤتمت',
        includeMedia: true,
      },
      ownerToken
    );

    assert(createRes.status === 201, `POST /admin/backups returns HTTP 201 Created (got ${createRes.status})`);
    assert(createRes.body.success === true, 'Response indicates success: true');
    assert(!!createRes.body.data?.id, 'Backup ID generated in response');

    const backupId = createRes.body.data.id;
    const filename = createRes.body.data.filename;
    console.log(`  📦 Generated Backup ID: ${backupId}, Filename: ${filename}`);

    console.log('\n----------------------------------------------------------------');
    console.log('TEST 2: Physical Archive Verification on Disk & Manifest Inspection');
    console.log('----------------------------------------------------------------');

    const backupStorageDir = path.join(process.cwd(), 'storage', 'backups');
    const zipPath = path.join(backupStorageDir, filename);

    assert(fs.existsSync(zipPath), `ZIP archive file exists on disk at ${zipPath}`);

    const fileBuffer = fs.readFileSync(zipPath);
    const expectedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    assert(createRes.body.data.checksum === expectedChecksum, `SHA-256 checksum matches calculated file hash (${expectedChecksum.slice(0, 16)}...)`);

    const zip = new AdmZip(zipPath);
    const manifestEntry = zip.getEntry('manifest.json');
    assert(!!manifestEntry, 'ZIP contains manifest.json in root');

    const manifest = JSON.parse(manifestEntry!.getData().toString('utf-8'));
    assert(manifest.backupId === backupId, 'manifest.json references correct backupId');
    assert(manifest.totalCollections >= 20, `manifest.json contains all system collections (found ${manifest.totalCollections})`);
    assert(!!zip.getEntry('database/services.json'), 'ZIP contains database/services.json');
    assert(!!zip.getEntry('database/admin_users.json'), 'ZIP contains database/admin_users.json');

    console.log('\n----------------------------------------------------------------');
    console.log('TEST 3: Audit Log Integration for Backup Creation');
    console.log('----------------------------------------------------------------');

    const auditEntry = await AuditLog.findOne({
      action: 'backup',
      entityId: backupId,
    }).sort({ createdAt: -1 });

    assert(!!auditEntry, 'Audit log record generated for backup action');
    assert(auditEntry?.status === 'success', 'Audit log record status is success');
    assert(
      Boolean(auditEntry?.description?.includes('نسخة احتياطية') || auditEntry?.details?.includes('نسخة احتياطية')),
      'Human-readable Arabic description recorded'
    );

    console.log('\n----------------------------------------------------------------');
    console.log('TEST 4: Authenticated & Authorized Download Streaming');
    console.log('----------------------------------------------------------------');

    // 4.1 Unauthenticated download request rejected
    const unauthDownload = await makeRequest('GET', `/admin/backups/${backupId}/download`);
    assert(unauthDownload.status === 401, `Unauthenticated download rejected with HTTP 401 (got ${unauthDownload.status})`);

    // 4.2 Authenticated download returns zip stream
    const authDownload = await makeRequest('GET', `/admin/backups/${backupId}/download`, undefined, ownerToken);
    assert(authDownload.status === 200, `Authenticated download returns HTTP 200 (got ${authDownload.status})`);
    assert(
      (authDownload.headers['content-type'] || '').includes('zip'),
      `Content-Type is application/zip (got ${authDownload.headers['content-type']})`
    );
    assert(
      authDownload.rawBuffer.length === fileBuffer.length,
      `Downloaded buffer matches exact file length on disk (${authDownload.rawBuffer.length} bytes)`
    );

    console.log('\n----------------------------------------------------------------');
    console.log('TEST 5: Pre-Restore Safety Snapshot & Full Restoration Flow');
    console.log('----------------------------------------------------------------');

    // Mutate the service price and title to test restoration recovery
    await Service.updateOne(
      { id: 'test-backup-service' },
      { $set: { price: 9999, title: 'خدمة معدلة قبل الاسترجاع' } }
    );
    const mutated = await Service.findOne({ id: 'test-backup-service' });
    assert(mutated?.price === 9999, 'Service modified to test restore recovery');

    // Perform restore using backupId
    const restoreRes = await makeRequest('POST', `/admin/backups/${backupId}/restore`, {}, ownerToken);
    assert(restoreRes.status === 200, `POST /admin/backups/:id/restore returns HTTP 200 (got ${restoreRes.status})`);
    assert(restoreRes.body.success === true, 'Restore response indicates success: true');
    assert(!!restoreRes.body.data?.preRestoreBackupId, `Pre-restore snapshot ID generated (${restoreRes.body.data?.preRestoreBackupId})`);

    // Verify service was restored back to 350 and original title
    const restoredService = await Service.findOne({ id: 'test-backup-service' });
    assert(restoredService?.price === 350, `Service price successfully restored to original (350, got ${restoredService?.price})`);
    assert(restoredService?.title === 'خدمة تجربة النسخ الاحتياطي', 'Service title successfully restored');

    // Verify pre-restore snapshot was recorded
    const preRestoreRecord = await BackupRecord.findOne({ id: restoreRes.body.data.preRestoreBackupId });
    assert(!!preRestoreRecord, 'Pre-restore backup point is stored in BackupRecord collection');
    assert(preRestoreRecord?.type === 'pre_restore', 'Pre-restore backup point has type: pre_restore');

    console.log('\n----------------------------------------------------------------');
    console.log('TEST 6: Security & Role-Based Authorization Enforcement');
    console.log('----------------------------------------------------------------');

    // Operator attempting to restore backup -> 403 Forbidden
    const opRestoreRes = await makeRequest('POST', `/admin/backups/${backupId}/restore`, {}, operatorToken);
    assert(opRestoreRes.status === 403, `Non-owner restore rejected with HTTP 403 (got ${opRestoreRes.status})`);

    // Operator attempting to delete backup -> 403 Forbidden
    const opDeleteRes = await makeRequest('DELETE', `/admin/backups/${backupId}`, undefined, operatorToken);
    assert(opDeleteRes.status === 403, `Non-owner delete rejected with HTTP 403 (got ${opDeleteRes.status})`);

    console.log('\n----------------------------------------------------------------');
    console.log('TEST 7: Backup Deletion & Storage Cleanup');
    console.log('----------------------------------------------------------------');

    const ownerDeleteRes = await makeRequest('DELETE', `/admin/backups/${backupId}`, undefined, ownerToken);
    assert(ownerDeleteRes.status === 200, `Owner delete returns HTTP 200 (got ${ownerDeleteRes.status})`);

    assert(!fs.existsSync(zipPath), 'Physical ZIP file was removed from storage directory');
    const deletedDbRecord = await BackupRecord.findOne({ id: backupId });
    assert(!deletedDbRecord, 'BackupRecord removed from MongoDB');

    console.log('\n================================================================');
    console.log('🎉 ALL BACKUP SYSTEM TESTS PASSED SUCCESSFULLY (7/7)!');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error.message || error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runBackupSystemTests();
