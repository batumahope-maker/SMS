import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { UsersClient } from '@/components/users/UsersClient';
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const users = await db.user.findMany({
    where: { schoolId: session.user.schoolId },
    select: { id: true, username: true, email: true, role: true, status: true, lastLogin: true, createdAt: true, phone: true },
    orderBy: { createdAt: 'desc' },
  });

  const counts = { admin: 0, teacher: 0, student: 0, parent: 0 };
  users.forEach(u => { if (u.role in counts) counts[u.role as keyof typeof counts]++; });

  return <UsersClient users={users} counts={counts} />;
}
