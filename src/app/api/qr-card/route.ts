import { NextResponse } from 'next/server';

/**
 * QR card generation is disabled: it depends on greenfield tables and would
 * render personal data.
 */
const BODY = {
  error: 'Not available',
  reason: 'QR card generation is not available in this build.',
};

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}
