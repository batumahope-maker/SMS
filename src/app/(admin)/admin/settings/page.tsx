import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SettingsClient } from '@/components/settings/SettingsClient';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  return <SettingsClient school={demoData.school} license={null} />;
}
