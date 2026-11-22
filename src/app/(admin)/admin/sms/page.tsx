import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SMSClient } from '@/components/sms/SMSClient';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export const dynamic = 'force-dynamic';

export default async function SMSPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');
  if (!isDemoMode()) {
    return (
      <div className="space-y-4">
        <div><h1 className="text-3xl font-bold tracking-tight">SMS</h1><p className="text-sm text-muted-foreground">SMS dispatch is disabled in this build.</p></div>
      </div>
    );
  }

  return (
    <SMSClient
      classes={demoData.aiData.classes}
      stats={demoData.smsStats}
      configured={false}
    />
  );
}
