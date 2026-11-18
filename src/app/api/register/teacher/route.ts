import type { NextRequest } from 'next/server';
import { handleRegistrationSubmission } from '@/lib/registration-api';

/**
 * Public teacher registration endpoint.
 * The role is fixed here, server-side: 'teacher'. Body fields are never used
 * to determine the role.
 */
export async function POST(request: NextRequest) {
  return handleRegistrationSubmission('teacher', request);
}
