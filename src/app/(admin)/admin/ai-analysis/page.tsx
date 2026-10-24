import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { AIAnalysisClient } from '@/components/ai/AIAnalysisClient';
export const dynamic = 'force-dynamic';

export default async function AIAnalysisPage() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher'].includes(session.user.role)) redirect('/login');

  const [students, classes] = await Promise.all([
    db.student.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, fullName: true, studentId: true },
      orderBy: { fullName: 'asc' },
    }),
    db.class.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return <AIAnalysisClient students={students} classes={classes} />;
}
