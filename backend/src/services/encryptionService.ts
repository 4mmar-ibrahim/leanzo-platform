import crypto from 'crypto';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { CustomerAddress } from '../models/CustomerAddress.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { EncryptionLog } from '../models/EncryptionLog.js';
import { ENV } from '../config/env.js';

// Secret key derivation (AES-256 requires 32 bytes)
const ENCRYPTION_SECRET = process.env.DATA_ENCRYPTION_KEY || ENV.JWT_SECRET || 'cleanzo-platform-master-encryption-key-2026';
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

    return {
      isEncrypted: true,
      algorithm: ALGORITHM,
      totalRecordsEncrypted: total,
      lastEncryptedAt: now,
      breakdown: {
        customers: customersCount,
        orders: ordersCount,
        messages: messagesCount,
        addresses: addressesCount,
      },
    };
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
 * Returns the current platform encryption status.
 */
export async function getEncryptionStatus(): Promise<EncryptionStats> {
  const settings = await SystemSettings.findOne({ key: 'global_settings' });
  const sec = (settings as any)?.security || {};

  // Count if any encrypted records exist in DB
  const [encCustomer, encBooking] = await Promise.all([
    User.findOne({ phone: { $regex: '^enc:v1:' } }),
    Booking.findOne({ customerPhone: { $regex: '^enc:v1:' } }),
  ]);

  const hasEncrypted = Boolean(encCustomer || encBooking || sec.isEncrypted);

  return {
    isEncrypted: hasEncrypted,
    algorithm: sec.algorithm || ALGORITHM,
    totalRecordsEncrypted: sec.totalRecordsEncrypted || 0,
    lastEncryptedAt: sec.lastEncryptedAt || null,
    breakdown: sec.breakdown || {
      customers: 0,
      orders: 0,
      messages: 0,
      addresses: 0,
    },
  };
}

/**
 * Retrieves the history of encryption operations.
 */
export async function getEncryptionLogs(limit = 20) {
  return EncryptionLog.find({}).sort({ timestamp: -1 }).limit(limit);
}
