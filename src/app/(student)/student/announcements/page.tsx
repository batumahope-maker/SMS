import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { AnnouncementsViewClient } from '@/components/student/AnnouncementsViewClient';
export const dynamic = 'force-dynamic';

export default async function StudentAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');
  const announcements = await db.announcement.findMany({
    where: { school: { users: { some: { id: session.user.id } } }, OR: [{ audience: 'all' }, { audience: 'students' }] },
    orderBy: { createdAt: 'desc' },
  });
  return <AnnouncementsViewClient announcements={announcements} role="student" />;
}
