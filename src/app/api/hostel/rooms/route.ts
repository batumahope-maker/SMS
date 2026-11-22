import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export async function GET(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not available' }, { status: 501 });
  }
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    rooms: demoData.hostelRooms,
    allocations: demoData.hostelAllocations,
  });
}

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not available' }, { status: 501 });
  }
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      roomNumber?: unknown;
      block?: unknown;
      floor?: unknown;
      capacity?: unknown;
      gender?: unknown;
    };
    const roomNumber = String(body.roomNumber ?? '').trim();
    const capacity = Number(body.capacity);
    if (!roomNumber || !Number.isInteger(capacity) || capacity < 1) {
      return NextResponse.json({ error: 'Room number and capacity are required.' }, { status: 400 });
    }

    const nextId = Math.max(0, ...demoData.hostelRooms.map((room) => Number(room.id.replace(/[^0-9]/g, '')) || 0)) + 1;
    const room = {
      id: `demo-hostel-room-${nextId}`,
      roomNumber,
      block: body.block == null ? null : String(body.block),
      floor: body.floor == null ? null : Number(body.floor),
      capacity,
      gender: body.gender == null ? 'Mixed' : String(body.gender),
      _count: { allocations: 0 },
    };
    demoData.hostelRooms.push(room as (typeof demoData.hostelRooms)[number]);
    return NextResponse.json({ ok: true, id: room.id });
  } catch (error) {
    console.error('Error adding demo hostel room:', error);
    return NextResponse.json({ error: 'Failed to add room.' }, { status: 500 });
  }
}
