/**
 * Temporary synthetic demo mode for Preview deployments.
 *
 * This flag is intentionally public and non-secret. It only selects the
 * in-memory demo data layer; it never contains credentials for real systems.
 * Set NEXT_PUBLIC_DEMO_MODE=1 on the ESSJT Preview environment only.
 */
export const DEMO_MODE_ENV_KEY = 'NEXT_PUBLIC_DEMO_MODE';

export const DEMO_PASSWORD = 'Demo1234!';

/** Public, synthetic accounts shown on the login screen in demo mode. */
export const DEMO_ACCOUNTS = [
  { role: 'admin', username: 'demo.admin', home: '/admin/dashboard' },
  { role: 'teacher', username: 'demo.teacher', home: '/teacher/dashboard' },
  { role: 'student', username: 'demo.student', home: '/student/dashboard' },
  { role: 'parent', username: 'demo.parent', home: '/parent/dashboard' },
] as const;

export function isDemoMode(): boolean {
  const value = process.env[DEMO_MODE_ENV_KEY];

  if (value !== undefined && (value === '0' || value.trim().toLowerCase() === 'false')) {
    return false;
  }
  if (value === '1' || (value ?? '').trim().toLowerCase() === 'true') return true;

  // Preview deployments get synthetic data by default so the teacher/admin
  // accounts work without asking the operator to change Vercel settings.
  // Local development and Production remain non-demo unless explicitly enabled.
  return process.env.VERCEL_ENV === 'preview';
}

/** Build-time-safe constant for client components. */
export const DEMO_MODE_ENABLED = isDemoMode();

export const DEMO_WRITE_DISABLED_MESSAGE =
  'Writes are disabled in demo mode. No data was saved.';
