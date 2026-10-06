/**
 * CLEANZO - STRICT CUSTOMER NAME VALIDATION
 * Rejects empty / whitespace-only inputs, symbols, special characters, and digits.
 * Accepts legitimate Arabic and Latin alphabetical names (including spaces, hyphens, and apostrophes).
 */

export interface NameValidationResult {
  isValid: boolean;
  message?: string;
  code?: 'NAME_REQUIRED' | 'INVALID_CHARACTERS' | 'TOO_SHORT' | 'TOO_LONG';
}

const FORBIDDEN_NAME_CHARS_REGEX = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z\s\-']/;

export function validateCustomerName(name: any, isAr: boolean = true): NameValidationResult {
  if (typeof name !== 'string') {
    const msg = isAr ? 'يرجى إدخال اسم العميل.' : 'Please enter customer name.';
    return { isValid: false, message: msg, code: 'NAME_REQUIRED' };
  }

  const clean = name.trim();

  // 1. Empty or spaces-only
  if (!clean) {
    const msg = isAr ? 'يرجى إدخال اسم العميل.' : 'Please enter customer name.';
    return { isValid: false, message: msg, code: 'NAME_REQUIRED' };
  }

  // 2. Reject symbols, numbers, and special characters
  if (FORBIDDEN_NAME_CHARS_REGEX.test(clean)) {
    const msg = isAr
      ? 'اسم العميل يجب أن يحتوي على أحرف فقط دون أرقام أو رموز خاصة.'
      : 'Customer name must only contain letters without numbers or special symbols.';
    return { isValid: false, message: msg, code: 'INVALID_CHARACTERS' };
  }

  // 3. Must contain at least 2 alphabetical letters
  const lettersOnly = clean.replace(/[^a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '');
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

  return { isValid: true };
}
