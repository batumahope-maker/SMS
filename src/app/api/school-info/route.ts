import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public endpoint — returns school name, logo, motto only (no sensitive data)
export async function GET() {
  try {
    const school = await db.school.findFirst({
      select: { name: true, logo: true, motto: true, primaryColor: true },
    });
    if (!school) return NextResponse.json(null);
    return NextResponse.json(school, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json(null);
  }
}
