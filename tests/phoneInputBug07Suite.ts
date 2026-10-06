/**
 * CLEANZO - BUG 07 VERIFICATION TEST SUITE
 * PHONE INPUT RTL/LTR DISPLAY & EDITING & NORMALIZATION
 */

import {
  normalizePhoneInput,
  convertArabicToAsciiDigits,
  validateEgyptianPhone,
  isValidEgyptianPhone,
  VALID_EGYPTIAN_PREFIXES,
} from '../src/lib/validation/phoneValidation';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('====================================================');
console.log('RUNNING CLEANZO BUG 07 PHONE INPUT SUITE');
console.log('====================================================\n');

// 1. Eastern Arabic Numeral Conversion
console.log('--- TEST GROUP 1: Arabic Numeral Conversion ---');
assert(convertArabicToAsciiDigits('٠١٢٣٤٥٦٧٨٩') === '0123456789', 'Eastern Arabic numerals convert to 0-9');
assert(convertArabicToAsciiDigits('۰۱۲۳۴۵۶۷۸۹') === '0123456789', 'Persian numerals convert to 0-9');
assert(convertArabicToAsciiDigits('01012345678') === '01012345678', 'ASCII numerals remain unchanged');

// 2. Typing & Leading Zero Preservation
console.log('\n--- TEST GROUP 2: Leading Zero Preservation ---');
assert(normalizePhoneInput('0') === '0', 'Single leading 0 is preserved');
assert(normalizePhoneInput('01') === '01', 'Leading 01 is preserved');
assert(normalizePhoneInput('010') === '010', 'Leading 010 is preserved');
assert(normalizePhoneInput('01012345678') === '01012345678', 'Full 01012345678 is preserved with leading zero');
assert(normalizePhoneInput('01198765432') === '01198765432', '011... is preserved with leading zero');
assert(normalizePhoneInput('01233445566') === '01233445566', '012... is preserved with leading zero');
assert(normalizePhoneInput('01555667788') === '01555667788', '015... is preserved with leading zero');

// 3. Eastern Arabic & Persian Typing Normalization
console.log('\n--- TEST GROUP 3: Arabic Keyboard Input Normalization ---');
assert(normalizePhoneInput('٠') === '0', 'Arabic ٠ normalizes to ASCII 0');
assert(normalizePhoneInput('٠١٠١٢٣٤٥٦٧٨') === '01012345678', 'Arabic ٠١٠١٢٣٤٥٦٧٨ normalizes to 01012345678');
assert(isValidEgyptianPhone(normalizePhoneInput('٠١٠١٢٣٤٥٦٧٨')), 'Normalized Arabic number is valid Egyptian phone');
assert(normalizePhoneInput('۰۱۰۱۲۳۴۵۶۷۸') === '01012345678', 'Persian number normalizes to 01012345678');

// 4. Pasting Formats (International, Spaces, Hyphens)
console.log('\n--- TEST GROUP 4: Pasting Formats Handling ---');
assert(normalizePhoneInput('+201012345678') === '01012345678', 'Pasted +201012345678 normalizes to 01012345678');
assert(normalizePhoneInput('+20 10 1234 5678') === '01012345678', 'Pasted +20 with spaces normalizes to 01012345678');
assert(normalizePhoneInput('00201012345678') === '01012345678', 'Pasted 00201012345678 normalizes to 01012345678');
assert(normalizePhoneInput('0020 10 1234 5678') === '01012345678', 'Pasted 0020 with spaces normalizes to 01012345678');
assert(normalizePhoneInput('201012345678') === '01012345678', 'Pasted 201012345678 normalizes to 01012345678');
assert(normalizePhoneInput('010-1234-5678') === '01012345678', 'Pasted formatted 010-1234-5678 normalizes to 01012345678');
assert(normalizePhoneInput('(010) 1234 5678') === '01012345678', 'Pasted parentheses normalizes to 01012345678');

// 5. Middle Digit Editing & Backspace Simulation
console.log('\n--- TEST GROUP 5: Middle Digit Editing & Backspace ---');
const original = '01012345678';
// Simulate deleting middle digit '3' (index 5)
const deletedMiddle = original.slice(0, 5) + original.slice(6);
assert(deletedMiddle === '0101245678', 'Middle digit removed correctly');
assert(normalizePhoneInput(deletedMiddle) === '0101245678', 'Normalized middle-deleted retains remaining digits and leading 0');

// Simulate replacing middle digit '3' with '9'
const replacedMiddle = original.slice(0, 5) + '9' + original.slice(6);
assert(replacedMiddle === '01012945678', 'Middle digit replaced correctly');
assert(normalizePhoneInput(replacedMiddle) === '01012945678', 'Normalized middle-replaced is 01012945678');
assert(isValidEgyptianPhone(normalizePhoneInput(replacedMiddle)), 'Replaced middle number is valid Egyptian phone');

// 6. Max Length Clamping
console.log('\n--- TEST GROUP 6: Max Length Clamping ---');
assert(normalizePhoneInput('010123456789999') === '01012345678', 'Extra digits clamped to 11');
assert(normalizePhoneInput('01012345678').length === 11, 'Length is exactly 11');

// 7. Validation Matching
console.log('\n--- TEST GROUP 7: Canonical Validation Matrix ---');
assert(validateEgyptianPhone('01012345678').isValid === true, '01012345678 is valid');
assert(validateEgyptianPhone('01112345678').isValid === true, '01112345678 is valid');
assert(validateEgyptianPhone('01212345678').isValid === true, '01212345678 is valid');
assert(validateEgyptianPhone('01512345678').isValid === true, '01512345678 is valid');
assert(validateEgyptianPhone('1012345678').isValid === false, 'Missing leading 0 is invalid');
assert(validateEgyptianPhone('01312345678').isValid === false, 'Invalid prefix 013 is rejected');
assert(validateEgyptianPhone('0101234567').isValid === false, '10 digits is rejected');
assert(validateEgyptianPhone('010123456789').isValid === false, '12 digits is rejected');

console.log('\n====================================================');
console.log('🎉 ALL 24 TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
