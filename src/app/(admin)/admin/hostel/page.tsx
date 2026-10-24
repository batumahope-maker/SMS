import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { HostelClient } from '@/components/hostel/HostelClient';
export const dynamic = 'force-dynamic';

export default async function HostelPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [rooms, allocations] = await Promise.all([
    db.room.findMany({
      where: { schoolId: session.user.schoolId },
      include: { _count: { select: { allocations: true } } },
      orderBy: [{ block: 'asc' }, { roomNumber: 'asc' }],
    }),
    db.roomAllocation.findMany({
      where: { room: { schoolId: session.user.schoolId }, vacatedAt: null },
      include: {
        student: { select: { fullName: true, studentId: true, gender: true } },
        room: { select: { roomNumber: true, block: true } },
      },
      orderBy: { allocatedAt: 'desc' },
    }),
  ]);

  const stats = {
    totalRooms: rooms.length,
    totalBeds: rooms.reduce((s, r) => s + r.capacity, 0),
    occupied: allocations.length,
    available: rooms.reduce((s, r) => s + (r.capacity - r._count.allocations), 0),
  };

  return <HostelClient rooms={rooms} allocations={allocations} stats={stats} />;
}
