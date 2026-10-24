import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { AnnouncementsClient } from '@/components/announcements/AnnouncementsClient';
export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch announcements
  const announcements = await db.announcement.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <AnnouncementsClient
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        audience: a.audience,
        priority: a.priority,
        imageUrl: a.imageUrl,
        createdAt: a.createdAt,
      }))}
    />
  );
}
