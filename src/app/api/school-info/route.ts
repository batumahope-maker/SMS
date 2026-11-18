import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `schools` table, so school
 * branding cannot be stored there. Returning null is the documented contract
 * the landing page already handles.
 */
export async function GET() {
  return NextResponse.json(null, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
