/**
 * CLEANZO - STRICT EGYPTIAN CUSTOMER PHONE NUMBER VALIDATION
 * Canonical regex: /^(010|011|012|015)[0-9]{8}$/
 * Exactly 11 ASCII digits starting with 010, 011, 012, or 015.
 */

export const EGYPTIAN_PHONE_REGEX = /^(010|011|012|015)[0-9]{8}$/;
export const VALID_EGYPTIAN_PREFIXES = ['010', '011', '012', '015'] as const;

export const CANONICAL_PHONE_ERROR_MESSAGE =
  'رقم الهاتف يجب أن يتكون من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015.';
export const CANONICAL_PHONE_ERROR_CODE = 'INVALID_PHONE_NUMBER';

export interface PhoneValidationResult {
  isValid: boolean;
  message?: string;
  error?: string;
  code?: string;
  detailCode?: string;
}

/**
 * Returns true if the phone string strictly satisfies the canonical Egyptian phone rule.
 */
export function isValidEgyptianPhone(phone: any): boolean {
  if (typeof phone !== 'string') return false;
  return EGYPTIAN_PHONE_REGEX.test(phone.trim());
}

/**
 * Validates the phone number and returns a structured result with user-friendly Arabic error messages.
 */
export function validateEgyptianPhone(phone: any): PhoneValidationResult {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    const msg = 'يرجى إدخال رقم الهاتف.';
    return {
      isValid: false,
      message: msg,
      error: msg,
      code: 'PHONE_REQUIRED',
      detailCode: 'PHONE_REQUIRED',
    };
  }

  const clean = phone.trim();

  // Reject non-digits (spaces, hyphens, +, letters, symbols)
  if (/[^0-9]/.test(clean)) {
    const msg = 'يرجى إدخال أرقام فقط.';
    return {
      isValid: false,
      message: msg,
      error: msg,
      code: CANONICAL_PHONE_ERROR_CODE,
      detailCode: 'INVALID_CHARACTERS',
    };
  }

  // Reject invalid length
  if (clean.length !== 11) {
    const msg = 'رقم الهاتف يجب أن يتكون من 11 رقمًا.';
    return {
      isValid: false,
      message: msg,
      error: msg,
      code: CANONICAL_PHONE_ERROR_CODE,
      detailCode: 'INVALID_LENGTH',
    };
  }

  // Reject invalid prefix
  const prefix = clean.substring(0, 3);
  if (!VALID_EGYPTIAN_PREFIXES.includes(prefix as any)) {
    const msg = 'رقم الهاتف يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015.';
    return {
      isValid: false,
      message: msg,
      error: msg,
      code: CANONICAL_PHONE_ERROR_CODE,
      detailCode: 'INVALID_PREFIX',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Converts Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹) to standard ASCII digits (0-9).
 */
export function convertArabicToAsciiDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

/**
 * Normalizes user phone input:
 * - Converts Arabic/Indic/Persian numerals (٠١٢٣٤٥٦٧٨٩) to ASCII 0-9
 * - Handles pasted Egyptian international prefixes (+20, 0020, or 20) safely to 0...
 * - Strips any non-digit characters (spaces, hyphens, letters)
 * - Strictly preserves leading zero (e.g. 010...)
 * - Clamps to maximum 11 digits
 */
export function normalizePhoneInput(value: string): string {
  if (!value) return '';

  // 1. Convert Arabic / Persian numerals
  let clean = convertArabicToAsciiDigits(String(value));

  // 2. Handle pasted international prefixes (+20..., 0020...)
  clean = clean.trim();
  if (clean.startsWith('+20')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('0020')) {
    clean = '0' + clean.slice(4);
  }

  // 3. Strip non-digits (spaces, dashes, parens, letters)
  clean = clean.replace(/[^0-9]/g, '');

  // 4. Handle 12-digit string starting with 20 followed by Egyptian prefixes (10, 11, 12, 15)
  if (clean.length === 12 && clean.startsWith('20') && ['10', '11', '12', '15'].includes(clean.substring(2, 4))) {
    clean = '0' + clean.slice(2);
  }

  // 5. Clamp to max 11 digits
  return clean.slice(0, 11);
}

/**
 * Safe typing input filter that enforces digits-only and maximum 11 characters.
 */
export function sanitizePhoneInput(value: string): string {
  return normalizePhoneInput(value);
}

export const normalizeEgyptianPhone = normalizePhoneInput;
