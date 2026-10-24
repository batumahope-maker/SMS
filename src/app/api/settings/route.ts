import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const school = await db.school.findUnique({
    where: { id: session.user.schoolId },
    include: { license: true, settings: true },
  });
  return NextResponse.json(school);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, logo, address, phone, email, website, motto, primaryColor, secondaryColor, language, timezone, academicYear } = body;

  const school = await db.school.update({
    where: { id: session.user.schoolId },
    data: {
      name: name || undefined,
      logo: logo !== undefined ? (logo || null) : undefined,
      address: address || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      motto: motto || null,
      primaryColor: primaryColor || undefined,
      secondaryColor: secondaryColor || undefined,
      language: language || undefined,
      timezone: timezone || undefined,
      academicYear: academicYear || undefined,
    },
  });
  return NextResponse.json(school);
}
