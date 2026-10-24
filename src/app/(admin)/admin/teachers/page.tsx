import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TeachersClient } from '@/components/teachers/TeachersClient';
export const dynamic = 'force-dynamic';

export default async function TeachersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch teachers with related data
  const teachers = await db.teacher.findMany({
    where: { schoolId: session.user.schoolId },
    include: {
      user: {
        select: { email: true, phone: true },
      },
      classes: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch classes for the form
  const classes = await db.class.findMany({
    where: { schoolId: session.user.schoolId, status: 'active' },
    orderBy: { name: 'asc' },
  });

  return (
    <TeachersClient 
      teachers={teachers.map(t => ({
        id: t.id,
        teacherId: t.teacherId,
        fullName: t.fullName,
        gender: t.gender,
        phone: t.phone,
        subjects: t.subjects,
        department: t.department,
        qualification: t.qualification,
        salary: t.salary,
        status: t.status,
        joinDate: t.joinDate,
        email: t.user?.email || null,
        classCount: t.classes.length,
      }))} 
      classes={classes} 
    />
  );
}
