import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { LibraryClient } from '@/components/library/LibraryClient';
export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [books, issues] = await Promise.all([
    db.book.findMany({
      where: { schoolId: session.user.schoolId },
      include: { _count: { select: { issues: true } } },
      orderBy: { title: 'asc' },
    }),
    db.bookIssue.findMany({
      where: { book: { schoolId: session.user.schoolId }, returnedAt: null },
      include: { book: { select: { title: true } }, student: { select: { fullName: true, studentId: true } } },
      orderBy: { issuedAt: 'desc' },
    }),
  ]);

  return <LibraryClient books={books} activeIssues={issues} />;
}
