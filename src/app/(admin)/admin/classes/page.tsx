import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ClassesClient } from '@/components/classes/ClassesClient';
export const dynamic = 'force-dynamic';

export default async function ClassesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch classes with related data
  const classes = await db.class.findMany({
    where: { schoolId: session.user.schoolId },
    include: {
      teacher: { select: { fullName: true, teacherId: true } },
      students: { where: { status: 'active' }, select: { id: true } },
      subjects: { select: { id: true } },
    },
    orderBy: [{ level: 'asc' }, { section: 'asc' }],
  });

  // Fetch teachers for form
  const teachers = await db.teacher.findMany({
    where: { schoolId: session.user.schoolId, status: 'active' },
    select: { id: true, fullName: true, teacherId: true },
    orderBy: { fullName: 'asc' },
  });

  return (
    <ClassesClient
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        trade: c.trade,
        level: c.level,
        section: c.section,
        status: c.status,
        academicYear: c.academicYear,
        teacher: c.teacher,
        studentCount: c.students.length,
        subjectCount: c.subjects.length,
      }))}
      teachers={teachers}
    />
  );
}
