/**
 * Phone number validation utilities
 * Implements simplified libphonenumber-like validation for international phone numbers
 */

/**
 * Checks if a phone number matches valid international phone number patterns
 * @param phone - The phone number to validate (digits only)
 * @returns true if the phone number matches a known country code pattern
 */
export function isValidInternationalPhoneNumber(phone: string): boolean {
  const numericOnly = phone.replace(/[^0-9]/g, '');


  if (numericOnly.length < 7 || numericOnly.length > 14) {
    return false;
  }


  const validCountryCodePatterns = [

    /^1[2-9]\d{9}$/,

    /^44[1-9]\d{8,9}$/,

    /^49[1-9]\d{8,10}$/,

    /^33[1-9]\d{8}$/,

    /^39[0-9]\d{6,10}$/,

    /^34[6-9]\d{8}$/,

    /^31[1-9]\d{8}$/,

    /^32[1-9]\d{7,8}$/,

    /^41[1-9]\d{8}$/,

    /^43[1-9]\d{6,10}$/,

    /^61[2-9]\d{8}$/,

    /^81[1-9]\d{8,9}$/,

    /^82[1-9]\d{7,8}$/,

    /^86[1-9]\d{9,10}$/,

    /^91[6-9]\d{9}$/,

    /^55[1-9]\d{8,9}$/,

    /^52[1-9]\d{9}$/,

    /^54[1-9]\d{8,9}$/,

    /^57[1-9]\d{7,9}$/,

    /^27[1-9]\d{8}$/,

    /^234[7-9]\d{9}$/,

    /^254[7]\d{8}$/,

    /^255[6-9]\d{8}$/,

    /^20[1-9]\d{8,9}$/,

    /^7[3-9]\d{9}$/,

    /^90[5]\d{9}$/,

    /^966[5]\d{8}$/,

    /^971[5]\d{8}$/,

    /^92[3]\d{9}$/,

    /^880[1]\d{8,9}$/,

    /^62[8]\d{8,10}$/,

    /^60[1]\d{7,8}$/,

    /^66[6-9]\d{8}$/,

    /^63[9]\d{9}$/,

    /^84[3-9]\d{8}$/,

    /^65[6-9]\d{7}$/,
  ];

  return validCountryCodePatterns.some(pattern => pattern.test(numericOnly));
}

/**
 * Validates a phone number with comprehensive checks
 * @param phone - The phone number to validate
 * @returns Object with validation result and error message
 */
export function validatePhoneNumber(phone: string | null | undefined): { isValid: boolean; error?: string } {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }


  if (phone.startsWith('LID-')) {
    return {
      isValid: false,
      error: 'LID format phone numbers are not allowed'
    };
  }


  const numericOnly = phone.replace(/[^0-9]/g, '');
  
  if (numericOnly.length > 14) {
    return {
      isValid: false,
      error: 'Phone number is too long (maximum 14 digits allowed)'
    };
  }

  if (numericOnly.length < 7) {
    return {
      isValid: false,
      error: 'Phone number is too short (minimum 7 digits required)'
    };
  }


  if (numericOnly.length >= 15 && numericOnly.startsWith('120')) {
    return {
      isValid: false,
      error: 'WhatsApp group chat IDs are not allowed as contact phone numbers'
    };
  }





  return { isValid: true };
}

/**
 * Creates a SQL condition to filter out invalid phone numbers
 * @returns SQL condition string for filtering
 */
export function createPhoneValidationSQLCondition(): string {
  return `
    (
      phone IS NULL 
      OR (
        phone NOT LIKE 'LID-%' 
        AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 7 
        AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) <= 15
        AND NOT (LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 15 AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^120[0-9]+$')
      )
    )
  `;
}

export default {
  isValidInternationalPhoneNumber,
  validatePhoneNumber,
  createPhoneValidationSQLCondition
};
