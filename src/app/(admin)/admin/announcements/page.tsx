import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>announcements</code> table.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="rounded-lg border p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium">{announcement.title}</p>
                <Badge variant="outline">
                  {String(announcement.priority ?? 'Normal')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {announcement.content ?? ''}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(announcement.createdAt)}
                {announcement.targetAudience
                  ? ` · ${announcement.targetAudience}`
                  : ''}
              </p>
            </div>
          ))}
          {announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">No announcements found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
