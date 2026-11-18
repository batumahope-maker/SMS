import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `messages` table, so there is
 * no message read-state to update.
 */
const BODY = {
  error: 'Not available',
  reason: 'The live essjt_school_system schema has no messages table.',
};

export async function PATCH() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function POST() {
  return NextResponse.json(BODY, { status: 501 });
}
