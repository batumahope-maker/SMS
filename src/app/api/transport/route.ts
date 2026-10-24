import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicles = await db.vehicle.findMany({
    where: { schoolId: session.user.schoolId },
    include: { routes: { include: { _count: { select: { assignments: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(vehicles);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { vehicleNumber, driverName, driverPhone, capacity, vehicleType } = body;

  if (!vehicleNumber || !driverName || !driverPhone || !capacity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const vehicle = await db.vehicle.create({
    data: {
      schoolId: session.user.schoolId,
      vehicleNumber, driverName, driverPhone,
      capacity: parseInt(capacity),
      vehicleType: vehicleType || null,
    },
  });
  return NextResponse.json(vehicle, { status: 201 });
}
