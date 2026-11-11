/**
 * validation.js
 * Comprehensive form validation schemas, regex rules, and auto-formatting
 * for Pakistan freight logistics and authentication (CNIC, Mobile, NTN, etc.)
 */

// ─── Regular Expressions ───────────────────────────────────────────────────────

export const REGEX = {
  // Standard RFC 5322 compatible email pattern
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Pakistani CNIC: 5 digits - 7 digits - 1 digit (e.g., 35202-1234567-1)
  cnic: /^\d{5}-\d{7}-\d{1}$/,
  cnicRaw: /^\d{13}$/,

  // Pakistani Mobile Phone: 03XX-XXXXXXX or 03XXXXXXXXX or +923XXXXXXXXX (supports 0300-0359 including SCOM)
  phone: /^((\+92)|(0092))?0?3[0-5][0-9]-?\d{7}$/,
  phoneFormatted: /^03[0-5][0-9]-\d{7}$/,

  // Pakistani NTN: 7 digits - 1 digit or alphanumeric registration (7 to 15 chars)
  ntn: /^\d{7}-\d{1}$/,
  businessReg: /^[A-Za-z0-9-]{6,16}$/,

  // Pakistani Vehicle License Plate: 2-4 letters, optional year/series, 1-4 digits
  licensePlate: /^[A-Za-z]{2,4}[ -]?\d{1,4}([ -]?\d{1,4})?$/i,

  // Strictly positive numeric floats or integers
  positiveNumber: /^(?!0\d)\d*(\.\d+)?$/
};

// ─── Auto-Formatting Helpers (Smooth Masking While Typing) ─────────────────────

/**
 * Auto-format CNIC into XXXXX-XXXXXXX-X as the user types
 * @param {string} value 
 * @returns {string}
 */
export function formatCNIC(value = '') {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/**
 * Auto-format Pakistan mobile number into 03XX-XXXXXXX as the user types
 * @param {string} value 
 * @returns {string}
 */
export function formatPhone(value = '') {
  let cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+92')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0092')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('923') && cleaned.length >= 12) {
    cleaned = '0' + cleaned.slice(2);
  }
  const digits = cleaned.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/**
 * Auto-format NTN into XXXXXXX-X as the user types
 * @param {string} value 
 * @returns {string}
 */
export function formatNTN(value = '') {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 7) return digits;
  return `${digits.slice(0, 7)}-${digits.slice(7, 8)}`;
}

// ─── Validation Functions (Return error message or null) ─────────────────────────

export function validateEmail(email, isUrdu = false) {
  if (!email || !email.trim()) {
    return isUrdu ? 'ای میل ایڈریس درج کرنا لازمی ہے' : 'Email address is required';
  }
  if (!REGEX.email.test(email.trim())) {
    return isUrdu ? 'برائے مہربانی درست ای میل درج کریں (مثلاً name@domain.com)' : 'Please enter a valid email address (e.g. name@domain.com)';
  }
  return null;
}

export function validatePassword(password, isUrdu = false) {
  if (!password) {
    return isUrdu ? 'پاس ورڈ درج کرنا لازمی ہے' : 'Password is required';
  }
  if (password.length < 6) {
    return isUrdu ? 'پاس ورڈ کم از کم 6 حروف پر مشتمل ہونا چاہیے' : 'Password must be at least 6 characters long';
  }
  return null;
}

export function validateConfirmPassword(password, confirmPassword, isUrdu = false) {
  if (!confirmPassword) {
    return isUrdu ? 'پاس ورڈ کی تصدیق کریں' : 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return isUrdu ? 'پاس ورڈ مطابقت نہیں رکھتے' : 'Passwords do not match';
  }
  return null;
}

export function validateCNIC(cnic, isUrdu = false) {
  if (!cnic || !cnic.trim()) {
    return isUrdu ? 'شناختی کارڈ نمبر درج کرنا لازمی ہے' : 'CNIC number is required';
  }
  const formatted = formatCNIC(cnic);
  const raw = cnic.replace(/\D/g, '');
  if (raw.length !== 13 || !REGEX.cnic.test(formatted)) {
    return isUrdu ? 'درست 13 ہندسوں کا قومی شناختی کارڈ نمبر درج کریں (35202-1234567-1)' : 'Please enter a valid 13-digit CNIC (e.g. 35202-1234567-1)';
  }
  return null;
}

export function validatePhone(phone, isUrdu = false) {
  if (!phone || !phone.trim()) {
    return isUrdu ? 'موبائل نمبر درج کرنا لازمی ہے' : 'Mobile phone number is required';
  }
  const raw = phone.replace(/[^\d+]/g, '');
  const formatted = formatPhone(phone);
  if (!REGEX.phone.test(phone) && !REGEX.phoneFormatted.test(formatted)) {
    return isUrdu ? 'درست پاکستانی موبائل نمبر درج کریں (مثلاً 0300-1234567)' : 'Please enter a valid Pakistani mobile number (e.g. 0300-1234567)';
  }
  return null;
}

export function validateNTN(ntn, isUrdu = false, required = false) {
  if (!ntn || !ntn.trim()) {
    if (required) return isUrdu ? 'این ٹی این نمبر درج کرنا لازمی ہے' : 'NTN / Tax ID is required';
    return null;
  }
  const trimmed = ntn.trim();
  if (!REGEX.ntn.test(trimmed) && !REGEX.businessReg.test(trimmed)) {
    return isUrdu ? 'درست 8 ہندسوں کا این ٹی این (1234567-8) یا رجسٹریشن کوڈ درج کریں' : 'Enter a valid 8-digit NTN (1234567-8) or registration number';
  }
  return null;
}

export function validatePositiveNumber(value, fieldLabel = 'Value', isUrdu = false, min = 0.01) {
  if (value === undefined || value === null || value === '') {
    return isUrdu ? `${fieldLabel} درج کرنا لازمی ہے` : `${fieldLabel} is required`;
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return isUrdu ? `${fieldLabel} میں صرف اعداد لکھیں` : `${fieldLabel} must be a valid number`;
  }
  if (num < min) {
    return isUrdu ? `${fieldLabel} صفر سے زیادہ ہونا چاہیے` : `${fieldLabel} must be greater than zero`;
  }
  return null;
}

export function validateLicensePlate(plate, isUrdu = false) {
  if (!plate || !plate.trim()) {
    return isUrdu ? 'نمبر پلیٹ درج کرنا لازمی ہے' : 'License plate number is required';
  }
  if (plate.trim().length < 3) {
    return isUrdu ? 'درست نمبر پلیٹ درج کریں (مثلاً LEA-4421)' : 'Please enter a valid plate number (e.g. LEA-4421)';
  }
  return null;
}

export function validateRequired(value, fieldLabel = 'This field', isUrdu = false) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return isUrdu ? `${fieldLabel} درج کرنا لازمی ہے` : `${fieldLabel} is required`;
  }
  return null;
}
