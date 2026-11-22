/**
 * Guarded reads of the two ADDITIVE columns (`must_change_password`,
 * `registration_status`) that are approved for the live schema but not
 * applied to it yet (see the staged ALTER statements awaiting separate
 * approval).
 *
 * Behaviour until the live ALTER is approved:
 *   - every read goes through the read-only client with explicit column
 *     lists and parameterised values;
 *   - when the columns do not exist (MySQL error 1054), the helper answers
 *     with the pre-ALTER defaults (no pending registrations,
 *     mustChangePassword=false, registrationStatus=null) instead of failing
 *     the page — existing live reads are unaffected;
 *   - once the ALTER is applied, these queries just start returning data.
 */
import { isDemoMode } from './demo-mode';
import { demoData } from './demo-data';
import { db } from '@/lib/db';

export interface PendingRegistration {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'student' | 'teacher' | 'parent';
  createdAt: Date;
}

export interface UserRegistrationFlags {
  mustChangePassword: boolean;
  /** 'pending' | 'approved' | 'rejected'; null when the column is absent. */
  registrationStatus: string | null;
}

const globalForFlags = globalThis as unknown as {
  essjtRegistrationColumns: boolean | undefined;
};

function isUnknownColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.replace(/\s+/g, ' ');
  return (
    message.includes('Unknown column') ||
    /Code:\s*`?1054`?/.test(message) ||
    message.includes('ER_BAD_FIELD_ERROR')
  );
}

/** One-time probe (cached per server process). */
async function registrationColumnsAvailable(): Promise<boolean> {
  if (globalForFlags.essjtRegistrationColumns !== undefined) {
    return globalForFlags.essjtRegistrationColumns;
  }
  try {
    await db.$queryRaw`SELECT must_change_password, registration_status FROM users LIMIT 1`;
    globalForFlags.essjtRegistrationColumns = true;
  } catch (error) {
    if (isUnknownColumnError(error)) {
      globalForFlags.essjtRegistrationColumns = false;
    } else {
      throw error;
    }
  }
  return globalForFlags.essjtRegistrationColumns;
}

/**
 * Pending student/teacher registrations, newest first. Empty when the live
 * columns are not applied yet. In synthetic demo mode the queue lives in the
 * in-memory demo data.
 */
export async function fetchPendingRegistrations(): Promise<PendingRegistration[]> {
  if (isDemoMode()) {
    return demoData.registrations
      .filter((row) => row.registrationStatus === 'pending')
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 100)
      .map((row) => ({
        id: Number(row.id),
        username: row.username,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone ?? null,
        role: row.role,
        createdAt: new Date(row.createdAt),
      }));
  }

  if (!(await registrationColumnsAvailable())) return [];

  const rows = (await db.$queryRaw`
    SELECT id, username, full_name, email, phone, role, created_at
      FROM users
     WHERE role IN ('student', 'teacher')
       AND registration_status = 'pending'
     ORDER BY created_at DESC
     LIMIT 100
  `) as Array<{
    id: number;
    username: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: 'student' | 'teacher';
    created_at: Date;
  }>;

  return rows.map((row) => ({
    id: Number(row.id),
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Flags for one account. Before the live ALTER this reports the safe
 * defaults (mustChangePassword=false, registrationStatus=null) for an
 * existing account. Returns null when the account does not exist.
 */
export async function fetchUserRegistrationFlags(
  userId: number
): Promise<UserRegistrationFlags | null> {
  const exists = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!exists) return null;

  if (!(await registrationColumnsAvailable())) {
    return { mustChangePassword: false, registrationStatus: null };
  }

  const rows = await db.$queryRaw<{
    must_change_password: number | boolean;
    registration_status: string | null;
  }>`
    SELECT must_change_password, registration_status
      FROM users
     WHERE id = ${userId}
     LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    mustChangePassword: Number(row.must_change_password) === 1,
    registrationStatus: row.registration_status ?? null,
  };
}
