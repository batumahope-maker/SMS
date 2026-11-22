import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PromoteStudentsClient } from '@/components/promote/PromoteStudentsClient';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export const dynamic = 'force-dynamic';

export default async function PromotePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');
  if (!isDemoMode()) {
    return (
      <div className="space-y-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Student promotion</h1><p className="text-sm text-muted-foreground">Promotion needs academic-year and class tables that do not exist.</p></div>
      </div>
    );
  }

  return (
    <PromoteStudentsClient
      students={demoData.promoteData.students}
      classes={demoData.promoteData.classes}
      previewData={demoData.promoteData.previewData}
    />
  );
}
