import crypto from 'crypto';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { CustomerAddress } from '../models/CustomerAddress.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { EncryptionLog } from '../models/EncryptionLog.js';
import { ENV } from '../config/env.js';

// Secret key derivation (AES-256 requires 32 bytes)
const isExplicitKeyConfigured = Boolean(process.env.DATA_ENCRYPTION_KEY);
if (ENV.NODE_ENV === 'production' && !process.env.DATA_ENCRYPTION_KEY) {
  console.warn('⚠️ [SECURITY WARNING] DATA_ENCRYPTION_KEY is not set in production. Field encryption should use a dedicated secure key.');
}
const ENCRYPTION_SECRET = process.env.DATA_ENCRYPTION_KEY || ENV.JWT_SECRET || (ENV.NODE_ENV === 'production' ? 'cleanzo-production-fallback-key-requires-env' : 'cleanzo-dev-encryption-key-local');
const KEY = crypto.createHash('sha256').update(String(ENCRYPTION_SECRET)).digest();
const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptText(plainText: string | null | undefined): string {
  if (!plainText || typeof plainText !== 'string') return (plainText as string) || '';
  if (plainText.startsWith(PREFIX)) return plainText; // already encrypted

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM formatted ciphertext.
 */
export function decryptText(cipherText: string | null | undefined): string {
  if (!cipherText || typeof cipherText !== 'string') return (cipherText as string) || '';
  if (!cipherText.startsWith(PREFIX)) return cipherText; // not encrypted

  try {
    const parts = cipherText.replace(PREFIX, '').split(':');
    if (parts.length !== 3) return cipherText;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed for payload:', err);
    return cipherText;
  }
}

/**
 * Checks if a string is encrypted with cleanzo AES-256-GCM format.
 */
export function isEncrypted(value: any): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export interface EncryptionStats {
  isEncrypted: boolean;
  algorithm: string;
  totalRecordsEncrypted: number;
  lastEncryptedAt: Date | null;
  breakdown: {
    customers: number;
    orders: number;
    messages: number;
    addresses: number;
  };
  fieldLevel: {
    status: 'active' | 'inactive' | 'partial';
    isEncrypted: boolean;
    totalRecordsEncrypted: number;
    transparentDecryptionReady: boolean;
    blindIndexingReady: boolean;
    notes: string;
  };
  authSecurity: {
    passwordHashing: string;
    jwtSigning: string;
    status: 'active';
  };
  inTransit: {
    status: 'active' | 'unverifiable';
    tlsProtocol: string;
    notes: string;
  };
  atRest: {
    status: 'unverifiable_via_app';
    scope: string;
    notes: string;
  };
  keyStatus: {
    configured: boolean;
    keySource: 'env' | 'fallback_dev';
  };
}

/**
 * Performs full database scanning and encrypts sensitive fields across all collections:
 * - Customers (phone, email, notes)
 * - Bookings (customerPhone, customerEmail, notes, address)
 * - Customer Addresses (street, building, notes)
 * - Contact Messages (phone, message)
 */
export async function encryptAllDatabaseData(adminExecutingName = 'Super Admin'): Promise<EncryptionStats> {
  let customersCount = 0;
  let ordersCount = 0;
  let messagesCount = 0;
  let addressesCount = 0;

  try {
    // 1. Customers
    const customers = await User.find({});
    for (const cust of customers) {
      let changed = false;
      if (cust.phone && !isEncrypted(cust.phone)) {
        cust.phone = encryptText(cust.phone);
        changed = true;
      }
      if (cust.email && !isEncrypted(cust.email)) {
        cust.email = encryptText(cust.email);
        changed = true;
      }
      if ((cust as any).notes && typeof (cust as any).notes === 'string' && !isEncrypted((cust as any).notes)) {
        (cust as any).notes = encryptText((cust as any).notes);
        changed = true;
      }
      if (changed) {
        await cust.save();
        customersCount++;
      }
    }

    // 2. Bookings / Orders
    const bookings = await Booking.find({});
    for (const b of bookings) {
      let changed = false;
      if (b.customerPhone && !isEncrypted(b.customerPhone)) {
        b.customerPhone = encryptText(b.customerPhone);
        changed = true;
      }
      if ((b as any).customerEmail && !isEncrypted((b as any).customerEmail)) {
        (b as any).customerEmail = encryptText((b as any).customerEmail);
        changed = true;
      }
      if (b.notes && !isEncrypted(b.notes)) {
        b.notes = encryptText(b.notes);
        changed = true;
      }
      if (b.address && typeof b.address === 'object') {
        const addr = b.address as any;
        if (addr.street && !isEncrypted(addr.street)) {
          addr.street = encryptText(addr.street);
          changed = true;
        }
        if (addr.building && !isEncrypted(addr.building)) {
          addr.building = encryptText(addr.building);
          changed = true;
        }
        if (addr.notes && !isEncrypted(addr.notes)) {
          addr.notes = encryptText(addr.notes);
          changed = true;
        }
        b.address = addr;
      }
      if (changed) {
        await b.save();
        ordersCount++;
      }
    }

    // 3. Customer Delivery Addresses
    const addresses = await CustomerAddress.find({});
    for (const a of addresses) {
      let changed = false;
      if (a.customerPhone && !isEncrypted(a.customerPhone)) {
        a.customerPhone = encryptText(a.customerPhone);
        changed = true;
      }
      if (a.area && !isEncrypted(a.area)) {
        a.area = encryptText(a.area);
        changed = true;
      }
      if (a.building && !isEncrypted(a.building)) {
        a.building = encryptText(a.building);
        changed = true;
      }
      if (a.notes && !isEncrypted(a.notes)) {
        a.notes = encryptText(a.notes);
        changed = true;
      }
      if (changed) {
        await a.save();
        addressesCount++;
      }
    }

    // 4. Contact Messages
    const messages = await ContactMessage.find({});
    for (const m of messages) {
      let changed = false;
      if (m.phone && !isEncrypted(m.phone)) {
        m.phone = encryptText(m.phone);
        changed = true;
      }
      if (m.message && !isEncrypted(m.message)) {
        m.message = encryptText(m.message);
        changed = true;
      }
      if (changed) {
        await m.save();
        messagesCount++;
      }
    }

    const now = new Date();
    const total = customersCount + ordersCount + messagesCount + addressesCount;

    // Persist encryption metadata in SystemSettings
    await SystemSettings.findOneAndUpdate(
      { key: 'global_settings' },
      {
        $set: {
          'security.isEncrypted': true,
          'security.lastEncryptedAt': now,
          'security.algorithm': ALGORITHM,
          'security.totalRecordsEncrypted': total,
          'security.breakdown': {
            customers: customersCount,
            orders: ordersCount,
            messages: messagesCount,
            addresses: addressesCount,
          },
        },
      },
      { upsert: true, new: true }
    );

    // Save successful log
    await EncryptionLog.create({
      id: `enc-log-${Date.now()}`,
      timestamp: now,
      status: 'success',
      algorithm: ALGORITHM,
      totalRecordsEncrypted: total,
      breakdown: {
        customers: customersCount,
        orders: ordersCount,
        messages: messagesCount,
        addresses: addressesCount,
      },
      initiatedBy: adminExecutingName,
    });

    const statsObj: EncryptionStats = {
      isEncrypted: total > 0,
      algorithm: ALGORITHM,
      totalRecordsEncrypted: total,
      lastEncryptedAt: now,
      breakdown: {
        customers: customersCount,
        orders: ordersCount,
        messages: messagesCount,
        addresses: addressesCount,
      },
      fieldLevel: {
        status: total > 0 ? 'active' : 'inactive',
        isEncrypted: total > 0,
        totalRecordsEncrypted: total,
        transparentDecryptionReady: false,
        blindIndexingReady: false,
        notes: total > 0
          ? 'تم تشفير السجلات بنجاح'
          : 'لم يتم العثور على سجلات لتشفيرها',
      },
      authSecurity: {
        passwordHashing: 'Bcrypt Salted Hash (10 Rounds)',
        jwtSigning: 'HMAC-SHA256 Cryptographic Signature',
        status: 'active',
      },
      inTransit: {
        status: 'active',
        tlsProtocol: 'TLS 1.2 / TLS 1.3',
        notes: 'مشفر أثناء النقل في بيئة الإنتاج السحابية',
      },
      atRest: {
        status: 'unverifiable_via_app',
        scope: 'نظام التشغيل والتخزين السحابي',
        notes: 'تشفير القرص على مستوى البنية التحتية غير قابل للتحقق برمجياً من التطبيق',
      },
      keyStatus: {
        configured: isExplicitKeyConfigured,
        keySource: isExplicitKeyConfigured ? 'env' : 'fallback_dev',
      },
    };

    return statsObj;
  } catch (err: any) {
    // Record failed log
    try {
      await EncryptionLog.create({
        id: `enc-log-${Date.now()}`,
        timestamp: new Date(),
        status: 'failed',
        algorithm: ALGORITHM,
        totalRecordsEncrypted: 0,
        errorMessage: err.message || 'حدث خطأ غير متوقع أثناء تشفير البيانات',
        initiatedBy: adminExecutingName,
      });
    } catch (logErr) {
      console.error('Failed to write failure encryption log:', logErr);
    }
    throw new Error(`فشل تشفير البيانات: ${err.message || 'خطأ في معالجة السجلات'}`);
  }
}

/**
 * Returns the current platform encryption status based on actual, verified database records.
 */
export async function getEncryptionStatus(): Promise<EncryptionStats> {
  const settings = await SystemSettings.findOne({ key: 'global_settings' });
  const sec = (settings as any)?.security || {};

  // Accurately scan existing collections for records carrying the encryption prefix enc:v1:
  const [users, bookings, addresses, messages] = await Promise.all([
    User.find({}),
    Booking.find({}),
    CustomerAddress.find({}),
    ContactMessage.find({}),
  ]);

  const encCustomers = users.filter((u: any) => typeof u.phone === 'string' && u.phone.startsWith(PREFIX)).length;
  const encOrders = bookings.filter((b: any) => typeof b.customerPhone === 'string' && b.customerPhone.startsWith(PREFIX)).length;
  const encAddresses = addresses.filter((a: any) => typeof a.customerPhone === 'string' && a.customerPhone.startsWith(PREFIX)).length;
  const encMessages = messages.filter((m: any) => typeof m.phone === 'string' && m.phone.startsWith(PREFIX)).length;

  const actualTotal = encCustomers + encOrders + encAddresses + encMessages;
  const isTrulyEncrypted = actualTotal > 0;

  // Read lastEncryptedAt only if records exist or from verified success logs
  let lastEncryptedAt: Date | null = isTrulyEncrypted && sec.lastEncryptedAt ? new Date(sec.lastEncryptedAt) : null;
  if (!lastEncryptedAt && isTrulyEncrypted) {
    try {
      const latestLog = await EncryptionLog.findOne({ status: 'success' }).sort({ timestamp: -1 });
      if (latestLog && latestLog.timestamp) {
        lastEncryptedAt = new Date(latestLog.timestamp);
      }
    } catch {
      // Optional fallback
    }
  }

  return {
    isEncrypted: isTrulyEncrypted,
    algorithm: ALGORITHM,
    totalRecordsEncrypted: actualTotal,
    lastEncryptedAt,
    breakdown: {
      customers: encCustomers,
      orders: encOrders,
      messages: encMessages,
      addresses: encAddresses,
    },
    fieldLevel: {
      status: isTrulyEncrypted ? 'active' : 'inactive',
      isEncrypted: isTrulyEncrypted,
      totalRecordsEncrypted: actualTotal,
      transparentDecryptionReady: false,
      blindIndexingReady: false,
      notes: isTrulyEncrypted
        ? 'توجد سجلات مشفرة في قاعدة البيانات، ولكن لا توجد طبقة فك تشفير شفافة أو فهارس بحث عمياء'
        : 'تشفير حقول البيانات غير مفعّل حالياً (0 سجل مشفر). التطبيق يحتاج لطبقة فك تشفير تلقائية وفهارس بحث عمياء قبل تطبيقه لتفادي تعطل الدخول والبحث',
    },
    authSecurity: {
      passwordHashing: 'Bcrypt Salted Hash (10 Rounds)',
      jwtSigning: 'HMAC-SHA256 Cryptographic Signature',
      status: 'active',
    },
    inTransit: {
      status: 'active',
      tlsProtocol: 'TLS 1.2 / TLS 1.3 (مفعّل عبر البروكسي العكسي في بيئة الإنتاج السحابية)',
      notes: 'مشفر أثناء النقل في بيئة الإنتاج السحابية. في بيئة التطوير المحلية يعمل عبر HTTP.',
    },
    atRest: {
      status: 'unverifiable_via_app',
      scope: 'نظام التشغيل والتخزين السحابي (Disk / Storage Engine)',
      notes: 'يتم تشفير القرص والتخزين على مستوى البنية التحتية ونظام التشغيل (مثل LUKS أو BitLocker أو AWS EBS Encryption)، ولا يمكن لتطبيق Node.js استجواب وسائط التخزين الفيزيائية برمجياً.',
    },
    keyStatus: {
      configured: isExplicitKeyConfigured,
      keySource: isExplicitKeyConfigured ? 'env' : 'fallback_dev',
    },
  };
}

/**
 * Retrieves the history of encryption operations.
 */
export async function getEncryptionLogs(limit = 20) {
  return EncryptionLog.find({}).sort({ timestamp: -1 }).limit(limit);
}
