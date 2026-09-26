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
