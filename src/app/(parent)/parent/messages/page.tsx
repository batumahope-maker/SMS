import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ParentMessagesClient } from '@/components/parent/ParentMessagesClient';
export const dynamic = 'force-dynamic';

export default async function ParentMessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'parent') redirect('/login');

  const [received, sent, announcements] = await Promise.all([
    db.message.findMany({
      where: { receiverId: session.user.id },
      include: { sender: { select: { username: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.message.findMany({
      where: { senderId: session.user.id },
      include: { receiver: { select: { username: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.announcement.findMany({
      where: { schoolId: session.user.schoolId, audience: { in: ['all', 'parents'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Get list of school staff to message
  const staff = await db.user.findMany({
    where: { schoolId: session.user.schoolId, role: { in: ['admin', 'teacher'] } },
    select: { id: true, username: true, role: true },
    orderBy: { username: 'asc' },
  });

  return <ParentMessagesClient received={received} sent={sent} announcements={announcements} staff={staff} userId={session.user.id} />;
}
