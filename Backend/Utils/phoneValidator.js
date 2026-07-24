import { parsePhoneNumberWithError } from 'libphonenumber-js';

/**
 * Validates and normalizes phone numbers into E.164 format (+14155552671).
 * Supports prepended country codes or explicit country code columns.
 */
export const normalizeToE164 = (rawPhone, rawCountryCode = '') => {
  if (!rawPhone) return null;

  let cleanPhone = String(rawPhone).trim();
  let cleanCountryCode = String(rawCountryCode).trim();

  // Remove trailing decimal if number came from Excel/Google Sheets integer formatting (e.g. 1.4155552671e10)
  cleanPhone = cleanPhone.replace(/\.0$/, '');

  // If already starts with '+', parse directly
  if (cleanPhone.startsWith('+')) {
    try {
      const parsed = parsePhoneNumberWithError(cleanPhone);
      if (parsed && parsed.isValid()) {
        return parsed.number; // Returns E.164
      }
    } catch (e) {
      return null;
    }
  }

  // If country code is provided separately (e.g. "US" or "1" or "+1")
  if (cleanCountryCode) {
    if (!cleanCountryCode.startsWith('+') && !isNaN(cleanCountryCode)) {
      cleanCountryCode = `+${cleanCountryCode}`;
    }

    // Try joining "+1" and "4155552671"
    const combined = `${cleanCountryCode}${cleanPhone}`.replace(/[\s\-\(\)]/g, '');
    try {
      const parsed = parsePhoneNumberWithError(combined);
      if (parsed && parsed.isValid()) {
        return parsed.number;
      }
    } catch (e) {
      // Fallback try ISO country code (e.g., US, PK, GB)
      try {
        const parsed = parsePhoneNumberWithError(cleanPhone, cleanCountryCode.replace('+', '').toUpperCase());
        if (parsed && parsed.isValid()) {
          return parsed.number;
        }
      } catch (err) {
        return null;
      }
    }
  }

  // Fallback: try parsing with default US or raw string if valid
  try {
    const parsed = parsePhoneNumberWithError(`+${cleanPhone}`);
    if (parsed && parsed.isValid()) {
      return parsed.number;
    }
  } catch (e) {
    return null;
  }

  return null;
};
