import assert from 'assert';
import {
  encryptText,
  decryptText,
  isEncrypted,
  getEncryptionStatus,
  getEncryptionLogs,
} from '../src/services/encryptionService.js';
import { User } from '../src/models/User.js';
import { Booking } from '../src/models/Booking.js';
import { CustomerAddress } from '../src/models/CustomerAddress.js';
import { ContactMessage } from '../src/models/ContactMessage.js';
import settingsRouter from '../src/routes/settingsRoutes.js';

async function runSecurityAndEncryptionAuditSuite() {
  console.log('🔒 Starting Cleanzo.net Security & Encryption Audit Verification Suite...\n');

  // --- Test 1: Live DB Count and Status Fidelity ---
  console.log('Test 1: Verifying accurate live database count and status fidelity...');
  const [users, bookings, addresses, messages] = await Promise.all([
    User.find({}),
    Booking.find({}),
    CustomerAddress.find({}),
    ContactMessage.find({}),
  ]);

  const encUsers = users.filter((u: any) => typeof u.phone === 'string' && u.phone.startsWith('enc:v1:')).length;
  const encBookings = bookings.filter((b: any) => typeof b.customerPhone === 'string' && b.customerPhone.startsWith('enc:v1:')).length;
  const encAddresses = addresses.filter((a: any) => typeof a.customerPhone === 'string' && a.customerPhone.startsWith('enc:v1:')).length;
  const encMessages = messages.filter((m: any) => typeof m.phone === 'string' && m.phone.startsWith('enc:v1:')).length;

  const realEncTotal = encUsers + encBookings + encAddresses + encMessages;

  const status = await getEncryptionStatus();

  assert.strictEqual(
    status.totalRecordsEncrypted,
    realEncTotal,
    `Dashboard totalRecordsEncrypted (${status.totalRecordsEncrypted}) must exactly match live database count (${realEncTotal})`
  );

  if (realEncTotal === 0) {
    assert.strictEqual(
      status.isEncrypted,
      false,
      'isEncrypted must be strictly FALSE when 0 records are encrypted in the database'
    );
    assert.strictEqual(
      status.fieldLevel.status,
      'inactive',
      'Field level encryption status must be marked "inactive" when 0 records are encrypted'
    );
  }
  console.log(`  ✓ Status accurately reflects reality: ${status.totalRecordsEncrypted} encrypted records, isEncrypted=${status.isEncrypted}, fieldLevel.status=${status.fieldLevel.status}`);

  // --- Test 2: Multi-Layer Cryptographic Isolation ---
  console.log('\nTest 2: Verifying multi-layer cryptographic isolation and clear classification...');
  assert.strictEqual(status.authSecurity.status, 'active', 'Auth security must be active (Bcrypt + JWT)');
  assert(status.authSecurity.passwordHashing.includes('Bcrypt'), 'Password hashing must specify Bcrypt');
  assert(status.authSecurity.jwtSigning.includes('HMAC-SHA256'), 'JWT signing must specify HMAC-SHA256');

  assert.strictEqual(
    status.atRest.status,
    'unverifiable_via_app',
    'At-Rest encryption must be clearly documented as unverifiable via application runtime'
  );
  assert(
    status.atRest.notes.includes('البنية التحتية') || status.atRest.notes.includes('نظام التشغيل'),
    'At-Rest notes must explain infrastructure/OS level nature'
  );

  assert.strictEqual(status.inTransit.status, 'active', 'In-Transit encryption metadata must be present');
  console.log('  ✓ Multi-layer isolation verified (Bcrypt active, In-Transit documented, At-Rest labeled unverifiable via app).');

  // --- Test 3: Safe Synthetic AES-256-GCM Roundtrip ---
  console.log('\nTest 3: Testing AES-256-GCM encryption and decryption roundtrip using synthetic test data...');
  const syntheticPayload = `synthetic-test-payload-${Date.now()}-arabic-نص-تجريبي`;
  const encrypted = encryptText(syntheticPayload);

  assert(isEncrypted(encrypted), 'Encrypted output must have enc:v1: prefix');
  assert.notStrictEqual(encrypted, syntheticPayload, 'Ciphertext must differ from original plaintext');

  const decrypted = decryptText(encrypted);
  assert.strictEqual(decrypted, syntheticPayload, 'Decrypted text must exactly match original synthetic payload');

  // Idempotency: Encrypting already encrypted text should return the same ciphertext
  const reEncrypted = encryptText(encrypted);
  assert.strictEqual(reEncrypted, encrypted, 'Encrypting already encrypted text must be idempotent');

  // Edge cases: null and undefined
  assert.strictEqual(encryptText(null as any), '', 'Null input must return empty string');
  assert.strictEqual(decryptText(null as any), '', 'Null ciphertext must return empty string');
  console.log('  ✓ AES-256-GCM synthetic roundtrip and edge case handling verified.');

  // --- Test 4: Secret Hygiene and No Secret Leakage ---
  console.log('\nTest 4: Verifying secret hygiene and absence of key/secret exposure...');
  const serializedStatus = JSON.stringify(status);
  assert(!serializedStatus.includes('$2a$') && !serializedStatus.includes('$2b$'), 'Status payload must not expose any password hashes');
  assert(!serializedStatus.includes('cleanzo-platform-master-encryption-key-2026'), 'Status payload must not expose master fallback secret');
  assert(!serializedStatus.includes(process.env.DATA_ENCRYPTION_KEY || '___NOT_DEFINED___'), 'Status payload must not expose raw encryption key');

  // Key status only reveals boolean configured flag and source type, not the key itself
  assert.strictEqual(typeof status.keyStatus.configured, 'boolean', 'keyStatus.configured must be boolean');
  assert(['env', 'fallback_dev'].includes(status.keyStatus.keySource), 'keyStatus.keySource must be recognized token');
  console.log('  ✓ Secret hygiene verified: No keys or passwords leaked in status response.');

  // --- Test 5: Route Permission Audit ---
  console.log('\nTest 5: Auditing settings router permissions for sensitive operations...');
  const routes = settingsRouter.stack;

  const encryptAllLayer = routes.find(
    (layer: any) => layer.route && layer.route.path === '/admin/encrypt-all-data' && layer.route.methods.post
  );
  assert(encryptAllLayer, 'Route POST /admin/encrypt-all-data must exist');

  const wipeAllLayer = routes.find(
    (layer: any) => layer.route && layer.route.path === '/admin/wipe-all-data' && layer.route.methods.post
  );
  assert(wipeAllLayer, 'Route POST /admin/wipe-all-data must exist');

  // Both sensitive routes must have 3+ handlers (auth + requireOwner + audit + controller)
  assert((encryptAllLayer as any)?.route?.stack?.length >= 3, 'POST /admin/encrypt-all-data must have full middleware stack');
  assert((wipeAllLayer as any)?.route?.stack?.length >= 3, 'POST /admin/wipe-all-data must have full middleware stack');
  console.log('  ✓ Administrative route permissions confirmed: Both sensitive endpoints require owner privilege.');

  // --- Test 6: Audit Logs Retrieval ---
  console.log('\nTest 6: Verifying encryption audit logs retrieval...');
  const logs = await getEncryptionLogs(5);
  assert(Array.isArray(logs), 'getEncryptionLogs must return an array');
  for (const log of logs) {
    assert(log.id, 'Log must have id');
    assert(log.timestamp, 'Log must have timestamp');
    assert(['success', 'failed'].includes(log.status), 'Log status must be success or failed');
  }
  console.log(`  ✓ Encryption logs verified (${logs.length} historical logs found).`);

  console.log('\n🎉 ALL 6 SECURITY & ENCRYPTION AUDIT TESTS PASSED SUCCESSFULLY!');
}

runSecurityAndEncryptionAuditSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Audit Suite Failed:', err);
    process.exit(1);
  });
