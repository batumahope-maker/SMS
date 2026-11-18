import type { NextRequest } from 'next/server';
import { handleRegistrationSubmission } from '@/lib/registration-api';

/**
 * Public student registration endpoint.
 * The role is fixed here, server-side: 'student'. Body fields are never used
 * to determine the role.
 */
export async function POST(request: NextRequest) {
  return handleRegistrationSubmission('student', request);
}
