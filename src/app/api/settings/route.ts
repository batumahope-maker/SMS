import { NextResponse } from 'next/server';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json(null, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(demoData.school, { headers: { 'Cache-Control': 'no-store' } });
}

async function notAvailable() {
  return NextResponse.json(
    {
      error: 'Not available',
      reason: 'In demo mode settings are read-only and no settings store exists.',
    },
    { status: 501 }
  );
}

export async function PUT() {
  if (!isDemoMode()) return notAvailable();
  return notAvailable();
}

export async function POST() {
  if (!isDemoMode()) return notAvailable();
  return notAvailable();
}

export async function PATCH() {
  if (!isDemoMode()) return notAvailable();
  return notAvailable();
}
