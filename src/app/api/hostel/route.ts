import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rooms = await db.room.findMany({
    where: { schoolId: session.user.schoolId },
    include: {
      allocations: {
        where: { vacatedAt: null },
        include: { student: { select: { fullName: true, studentId: true } } },
      },
    },
    orderBy: { roomNumber: 'asc' },
  });
  return NextResponse.json(rooms);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { roomNumber, block, floor, capacity, gender } = body;

  if (!roomNumber || !capacity) {
    return NextResponse.json({ error: 'Room number and capacity are required' }, { status: 400 });
  }

  const room = await db.room.create({
    data: {
      schoolId: session.user.schoolId,
      roomNumber, capacity: parseInt(capacity),
      block: block || null,
      floor: floor ? parseInt(floor) : null,
      gender: gender || null,
    },
  });
  return NextResponse.json(room, { status: 201 });
}
