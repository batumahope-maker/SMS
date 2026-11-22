import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { HostelClient } from '@/components/hostel/HostelClient';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export const dynamic = 'force-dynamic';

export default async function HostelPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  if (!isDemoMode()) {
    return (
      <div className="space-y-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Hostel</h1><p className="text-sm text-muted-foreground">The live database has no hostel tables.</p></div>
        <div className="p-6"><p className="text-muted-foreground">Hostel management is available in synthetic demo mode.</p></div>
      </div>
    );
  }

  const rooms = demoData.hostelRooms;
  const allocations = demoData.hostelAllocations;
  const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupied = allocations.length;

  return (
    <HostelClient
      rooms={rooms}
      allocations={allocations}
      stats={{
        totalRooms: rooms.length,
        totalBeds,
        occupied,
        available: Math.max(0, totalBeds - occupied),
      }}
    />
  );
}
