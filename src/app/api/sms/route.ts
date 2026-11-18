import { NextResponse } from 'next/server';

/**
 * SMS sending is disabled: it depends on greenfield tables and would transmit
 * personal data to an external service, which is explicitly out of scope.
 */
const BODY = {
  error: 'Not available',
  reason:
    'SMS dispatch is disabled in this build. No personal data is transmitted to external services.',
};

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function POST() {
  return NextResponse.json(BODY, { status: 501 });
}
