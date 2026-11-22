import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AIAnalysisClient } from '@/components/ai/AIAnalysisClient';
import { demoData } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/demo-mode';

export const dynamic = 'force-dynamic';

export default async function AIAnalysisPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');
  if (!isDemoMode()) {
    return (
      <div className="space-y-4">
        <div><h1 className="text-3xl font-bold tracking-tight">AI analysis</h1><p className="text-sm text-muted-foreground">AI analysis requires tables that are not present in the live schema.</p></div>
      </div>
    );
  }

  return (
    <AIAnalysisClient
      students={demoData.aiData.students}
      classes={demoData.aiData.classes}
    />
  );
}
