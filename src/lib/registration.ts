/**
 * Shared validation and abuse-protection for the public registration forms.
 *
 * Everything here runs server-side. The page forms may pre-check input, but
 * the API routes never trust that: the route is what decides the role, and
 * every field is re-validated here before a write is attempted.
 *
 * No database access and no secrets.
 */

export interface FieldErrors {
  [field: string]: string;
}

/* -------------------------------------------------------------------------
 * Validation primitives
 * ---------------------------------------------------------------------- */

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,100}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;
const NAME_PATTERN = /^[^<>{}$\\]{2,200}$/;
/** Matches the live `users.role` values that self-registration may create. */
const GENDER_VALUES = ['Male', 'Female', 'Other'] as const;
export const REGISTRATION_GENDERS = GENDER_VALUES;

const FREE_TEXT_MAX: Record<string, number> = {
  trade: 100,
  level: 20,
  section: 10,
  subject: 100,
  department: 100,
};

export function validateUsername(username: unknown): string | null {
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username.trim())) {
    return 'Username must be 3–100 characters: letters, numbers, dots, dashes or underscores.';
  }
  return null;
}

export function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string' || email.trim().length > 150) {
    return 'Email is required (max 150 characters).';
  }
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function validateFullName(name: unknown): string | null {
  if (typeof name !== 'string' || !NAME_PATTERN.test(name.trim())) {
    return 'Full name must be 2–200 characters.';
  }
  return null;
}

export function validatePhone(phone: unknown, label = 'Phone number'): string | null {
  if (typeof phone !== 'string' || !PHONE_PATTERN.test(phone.trim())) {
    return `${label} must be 7–20 digits.`;
  }
  return null;
}

/**
 * Passwords: 8–72 characters with at least one letter and one digit.
 * bcrypt keeps at most 72 bytes, so longer input would be silently truncated.
 */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return 'Password must be 8–72 characters.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one digit.';
  }
  return null;
}

export function validateDate(value: unknown, label: string): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${label} is required.`;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return `${label} is not a valid date.`;
  return null;
}

export function validateRequiredText(
  value: unknown,
  field: string,
  label: string
): string | null {
  const max = FREE_TEXT_MAX[field];
  if (typeof value !== 'string' || value.trim() === '') {
    return `${label} is required.`;
  }
  if (max && value.length > max) {
    return `${label} must be at most ${max} characters.`;
  }
  return null;
}

export function validateGender(value: unknown): string | null {
  if (typeof value !== 'string' || !(GENDER_VALUES as readonly string[]).includes(value)) {
    return 'Select a gender.';
  }
  return null;
}

/* -------------------------------------------------------------------------
 * Honeypot
 * ---------------------------------------------------------------------- */

/**
 * The forms include a hidden `website` input that humans never see or fill.
 * Bots that fill it are silently accepted (200) but nothing is written.
 */
export function isHoneypotTripped(body: Record<string, unknown>): boolean {
  const website = body?.website;
  return typeof website === 'string' ? website.trim() !== '' : website !== undefined && website !== null;
}

/* -------------------------------------------------------------------------
 * Rate limiting (in-memory, per IP)
 * ---------------------------------------------------------------------- */

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MINUTES = 60;

function rateLimitConfig(): { max: number; windowMs: number } {
  const max = Number(process.env.REGISTRATION_RATE_LIMIT_MAX);
  const minutes = Number(process.env.REGISTRATION_RATE_LIMIT_WINDOW_MINUTES);
  return {
    max: Number.isSafeInteger(max) && max > 0 ? max : DEFAULT_MAX,
    windowMs:
      Number.isSafeInteger(minutes) && minutes > 0
        ? minutes * 60_000
        : DEFAULT_WINDOW_MINUTES * 60_000,
  };
}

const attempts = new Map<string, number[]>();

/** True when the caller may submit again. In-memory only (resets on restart). */
export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const { max, windowMs } = rateLimitConfig();
  const now = Date.now();

  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }
  recent.push(now);
  attempts.set(key, recent);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (attempts.size > 5000) {
    for (const [k, stamps] of attempts) {
      if (stamps.every((t) => now - t >= windowMs)) attempts.delete(k);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Extract a best-effort client key from proxy headers. */
export function clientKeyOf(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/* -------------------------------------------------------------------------
 * Student / teacher payload validation
 * ---------------------------------------------------------------------- */

export interface ValidatedStudentRegistration {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  trade: string;
  level: string;
  section: string;
  gender: string;
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  enrollmentDate: string;
}

export interface ValidatedTeacherRegistration {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  department: string;
  hireDate: string;
}

/** Validate a student registration body. Returns the clean fields or errors. */
export function validateStudentRegistration(
  body: Record<string, unknown>
): { ok: true; value: ValidatedStudentRegistration } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const get = (k: string) => (typeof body?.[k] === 'string' ? (body[k] as string).trim() : '');

  const checks: Array<[string, string | null]> = [
    ['username', validateUsername(get('username'))],
    ['email', validateEmail(get('email'))],
    ['fullName', validateFullName(get('fullName'))],
    ['phone', validatePhone(get('phone'), 'Phone number')],
    ['trade', validateRequiredText(get('trade'), 'trade', 'Trade')],
    ['level', validateRequiredText(get('level'), 'level', 'Level')],
    ['section', validateRequiredText(get('section'), 'section', 'Section')],
    ['gender', validateGender(get('gender'))],
    ['dateOfBirth', validateDate(get('dateOfBirth'), 'Date of birth')],
    ['guardianName', validateFullName(get('guardianName'))],
    ['guardianPhone', validatePhone(get('guardianPhone'), 'Guardian phone')],
    ['enrollmentDate', validateDate(get('enrollmentDate'), 'Enrollment date')],
  ];
  for (const [field, error] of checks) if (error) errors[field] = error;

  const passwordError = validatePassword(body?.password);
  if (passwordError) errors.password = passwordError;
  else if (body?.confirmPassword !== body?.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      username: get('username'),
      password: body.password as string,
      fullName: get('fullName'),
      email: get('email'),
      phone: get('phone'),
      trade: get('trade'),
      level: get('level'),
      section: get('section'),
      gender: get('gender'),
      dateOfBirth: get('dateOfBirth'),
      guardianName: get('guardianName'),
      guardianPhone: get('guardianPhone'),
      enrollmentDate: get('enrollmentDate'),
    },
  };
}

/** Validate a teacher registration body. Returns the clean fields or errors. */
export function validateTeacherRegistration(
  body: Record<string, unknown>
): { ok: true; value: ValidatedTeacherRegistration } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const get = (k: string) => (typeof body?.[k] === 'string' ? (body[k] as string).trim() : '');

  const checks: Array<[string, string | null]> = [
    ['username', validateUsername(get('username'))],
    ['email', validateEmail(get('email'))],
    ['fullName', validateFullName(get('fullName'))],
    ['phone', validatePhone(get('phone'), 'Phone number')],
    ['subject', validateRequiredText(get('subject'), 'subject', 'Subject')],
    ['department', validateRequiredText(get('department'), 'department', 'Department')],
    ['hireDate', validateDate(get('hireDate'), 'Hire date')],
  ];
  for (const [field, error] of checks) if (error) errors[field] = error;

  const passwordError = validatePassword(body?.password);
  if (passwordError) errors.password = passwordError;
  else if (body?.confirmPassword !== body?.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      username: get('username'),
      password: body.password as string,
      fullName: get('fullName'),
      email: get('email'),
      phone: get('phone'),
      subject: get('subject'),
      department: get('department'),
      hireDate: get('hireDate'),
    },
  };
}
