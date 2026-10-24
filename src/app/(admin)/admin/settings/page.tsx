import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { SettingsClient } from '@/components/settings/SettingsClient';
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch school settings
  const school = await db.school.findUnique({
    where: { id: session.user.schoolId },
    include: { license: true },
  });

  if (!school) {
    redirect('/login');
  }

  // Fetch all settings
  const settings = await db.setting.findMany({
    where: { schoolId: session.user.schoolId },
  });

  return (
    <SettingsClient
      school={{
        id: school.id,
        name: school.name,
        slug: school.slug,
        logo: school.logo,
        address: school.address,
        phone: school.phone,
        email: school.email,
        website: school.website,
        motto: school.motto,
        primaryColor: school.primaryColor,
        secondaryColor: school.secondaryColor,
        language: school.language,
        timezone: school.timezone,
        academicYear: school.academicYear,
        licenseStatus: school.licenseStatus,
        plan: school.plan,
      }}
      license={school.license ? {
        key: school.license.key,
        plan: school.license.plan,
        maxStudents: school.license.maxStudents,
        maxTeachers: school.license.maxTeachers,
        expiresAt: school.license.expiresAt,
        status: school.license.status,
      } : null}
    />
  );
}
