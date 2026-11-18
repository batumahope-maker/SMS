import { NextResponse } from 'next/server';

/**
 * The live essjt_school_system database has no `messages` table.
 */
const BODY = {
  error: 'Not available',
  reason: 'The live essjt_school_system schema has no messages table.',
};

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function POST() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function PUT() {
  return NextResponse.json(BODY, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json(BODY, { status: 501 });
}
