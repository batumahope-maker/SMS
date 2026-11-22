/**
 * Demo-mode write paths for the registration approval flow.
 *
 * These are the synthetic equivalents of the live writer procedures
 * sp_approve_registration / sp_reject_registration: they mutate only the
 * in-memory demo data and reproduce the live behaviour:
 *
 *   - approve: activates the account (status='Active', registration_status=
 *     'approved') and assigns the role the applicant applied for;
 *   - reject: marks the registration rejected and leaves the account
 *     inactive, so a rejected applicant can never sign in;
 *   - duplicate usernames/emails are refused (the live tables enforce the
 *     same unique indexes);
 *   - approving an already processed or unknown registration fails with
 *     WriterError code NO_PENDING_REGISTRATION, mapped to HTTP 409 by the
 *     admin approval routes.
 *
 * The approved account is stored with a synthetic password that matches the
 * other demo accounts so its role can be verified through the real
 * credentials flow.
 */
import { createHash } from 'crypto';
import { WriterError } from './db-writer';
import { demoData } from './demo-data';
import { DEMO_PASSWORD } from './demo-mode';

function md5Hex(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

function findRegistration(
  userId: number
): (typeof demoData.registrations)[number] | undefined {
  return demoData.registrations.find((row) => Number(row.id) === userId);
}

function isPending(
  registration: (typeof demoData.registrations)[number] | undefined
): registration is (typeof demoData.registrations)[number] {
  return Boolean(registration && registration.registrationStatus === 'pending');
}

function usernameTaken(username: string, exceptId: number): boolean {
  return demoData.user.some(
    (row) => row.username === username && Number(row.id) !== exceptId
  );
}

function emailTaken(email: string): boolean {
  return demoData.user.some((row) => row.email === email);
}

export async function approveRegistrationDemo(
  userId: number
): Promise<{ userId: number }> {
  const registration = findRegistration(userId);
  if (!isPending(registration)) {
    throw new WriterError('NO_PENDING_REGISTRATION', 'NO_PENDING_REGISTRATION');
  }

  // Duplicate prevention: account usernames and emails are unique (the live
  // schema enforces unique indexes on both columns).
  if (usernameTaken(registration.username, registration.id)) {
    throw new WriterError('DUPLICATE_USERNAME', 'DUPLICATE_USERNAME');
  }
  if (emailTaken(registration.email)) {
    throw new WriterError('DUPLICATE_EMAIL', 'DUPLICATE_EMAIL');
  }

  // Role assignment: the applicant is activated with the role they applied
  // for. Nothing creates admin accounts here.
  demoData.user.push({
    id: registration.id,
    username: registration.username,
    password: md5Hex(DEMO_PASSWORD),
    fullName: registration.fullName,
    email: registration.email,
    phone: registration.phone ?? '',
    role: registration.role,
    status: 'Active',
    createdAt: registration.createdAt,
    registrationStatus: 'approved',
  });

  registration.status = 'Active';
  registration.registrationStatus = 'approved';
  return { userId };
}

export async function rejectRegistrationDemo(
  userId: number
): Promise<{ userId: number }> {
  const registration = findRegistration(userId);
  if (!isPending(registration)) {
    throw new WriterError('NO_PENDING_REGISTRATION', 'NO_PENDING_REGISTRATION');
  }
  // Rejection never activates anything: the account stays inactive.
  registration.status = 'Inactive';
  registration.registrationStatus = 'rejected';
  return { userId };
}

/**
 * Demo equivalent of sp_set_account_password: replace the synthetic account's
 * password and mark it for a forced change at the next sign-in.
 */
export async function setAccountPasswordDemo(
  userId: number,
  newPassword: string
): Promise<{ userId: number; temporaryPassword: string }> {
  const user = demoData.user.find((row) => Number(row.id) === userId);
  if (!user) {
    throw new WriterError('ACCOUNT_NOT_PERMITTED', 'ACCOUNT_NOT_PERMITTED');
  }
  user.password = md5Hex(newPassword);
  user.mustChangePassword = true;
  return { userId, temporaryPassword: newPassword };
}
