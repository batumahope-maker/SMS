import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { StudentsClient } from '@/components/students/StudentsClient';
export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch students with related data
  const students = await db.student.findMany({
    where: { schoolId: session.user.schoolId },
    include: {
      class: true,
      user: {
        select: { email: true, phone: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch classes for the form
  const classes = await db.class.findMany({
    where: { schoolId: session.user.schoolId, status: 'active' },
    orderBy: { name: 'asc' },
  });

  return <StudentsClient students={students} classes={classes} />;
}
