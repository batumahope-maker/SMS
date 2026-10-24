import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TransportClient } from '@/components/transport/TransportClient';
export const dynamic = 'force-dynamic';

export default async function TransportPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [vehicles, assignments] = await Promise.all([
    db.vehicle.findMany({
      where: { schoolId: session.user.schoolId },
      include: { routes: { include: { _count: { select: { assignments: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.transportAssignment.findMany({
      where: { student: { schoolId: session.user.schoolId } },
      include: {
        student: { select: { fullName: true, studentId: true } },
        route: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return <TransportClient vehicles={vehicles} assignments={assignments} />;
}
