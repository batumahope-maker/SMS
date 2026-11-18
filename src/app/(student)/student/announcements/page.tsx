import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { AnnouncementsViewClient } from '@/components/student/AnnouncementsViewClient';

export const dynamic = 'force-dynamic';

const STUDENT_AUDIENCES = new Set(['', 'all', 'students', 'student']);

export default async function StudentAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');

  const rows = await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const announcements = rows
    .filter((row) =>
      STUDENT_AUDIENCES.has(String(row.targetAudience ?? '').trim().toLowerCase())
    )
    .map((row) => ({
      id: String(row.id),
      title: row.title ?? 'Untitled',
      content: row.content ?? '',
      audience: row.targetAudience ?? 'all',
      priority: String(row.priority ?? 'Normal').trim().toLowerCase(),
      createdAt: row.createdAt ?? new Date(0),
    }));

  return <AnnouncementsViewClient announcements={announcements} role="student" />;
}
