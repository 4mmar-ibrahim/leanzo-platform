/**
 * CLEANZO - STRICT CUSTOMER NAME VALIDATION
 * Rejects empty / whitespace-only inputs, symbols, special characters, and digits.
 * Accepts legitimate Arabic and Latin alphabetical names (including spaces, hyphens, and apostrophes).
 */

export interface NameValidationResult {
  isValid: boolean;
  message?: string;
  code?: 'NAME_REQUIRED' | 'INVALID_CHARACTERS' | 'TOO_SHORT' | 'TOO_LONG';
  sanitizedName?: string;
}

/**
 * Clean invisible Unicode control characters (LRM, RLM, zero-width spaces, directional marks)
 * frequently injected by mobile keyboards (iOS / Android) when switching layouts, and normalize spaces.
 */
export function sanitizeNameString(str: any): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .trim();
}

// Digits in ASCII (0-9) and Arabic-Indic numerals (٠-٩)
const HAS_DIGITS_REGEX = /[0-9\u0660-\u0669\u06F0-\u06F9]/;

// Allowed characters: Arabic letters, Latin letters (including accented), spaces, hyphens, standard and smart apostrophes, periods
const ALLOWED_NAME_CHARS_REGEX = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z\u00C0-\u024F\s\-\'’‘.·]*$/;

export function validateCustomerName(name: any, isAr: boolean = true): NameValidationResult {
  if (typeof name !== 'string') {
    const msg = isAr ? 'يرجى إدخال اسم العميل.' : 'Please enter customer name.';
    return { isValid: false, message: msg, code: 'NAME_REQUIRED' };
  }

  const clean = sanitizeNameString(name);

  // 1. Empty or spaces-only
  if (!clean) {
    const msg = isAr ? 'يرجى إدخال اسم العميل.' : 'Please enter customer name.';
    return { isValid: false, message: msg, code: 'NAME_REQUIRED' };
  }

  // 2. Reject digits & forbidden symbols
  if (HAS_DIGITS_REGEX.test(clean) || !ALLOWED_NAME_CHARS_REGEX.test(clean)) {
    const msg = isAr
      ? 'اسم العميل يجب أن يحتوي على أحرف فقط دون أرقام أو رموز خاصة.'
      : 'Customer name must only contain letters without numbers or special symbols.';
    return { isValid: false, message: msg, code: 'INVALID_CHARACTERS' };
  }

  // 3. Must contain at least 2 alphabetical letters
  const lettersOnly = clean.replace(/[^a-zA-Z\u00C0-\u024F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '');
  if (lettersOnly.length < 2) {
    const msg = isAr
      ? 'اسم العميل يجب ألا يقل عن حرفين.'
      : 'Customer name must be at least 2 characters.';
    return { isValid: false, message: msg, code: 'TOO_SHORT' };
  }

  // 4. Maximum reasonable name length
  if (clean.length > 60) {
    const msg = isAr ? 'اسم العميل طويل جدًا.' : 'Customer name is too long.';
    return { isValid: false, message: msg, code: 'TOO_LONG' };
  }

  return { isValid: true, sanitizedName: clean };
}
