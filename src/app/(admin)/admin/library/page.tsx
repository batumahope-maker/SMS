import { BookOpen } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isWriterConfigured } from '@/lib/db-writer';
import { readLibraryData } from '@/lib/tl-reads';
import { LibraryClient } from '@/components/library/LibraryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  // The library tables arrive with the approved SQL package. Until then this
  // page keeps its honest empty state; once installed (already true in the
  // staging database) it renders the full management UI wired to the verified
  // admin-only write routes.
  const { installed, data } = await readLibraryData();

  if (!installed || !data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground">Read-only module.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-medium">No library records yet</span>
            </div>
            <CardTitle>Library records have not been added</CardTitle>
            <CardDescription>
              The live school database does not yet contain any library
              information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              The <code className="rounded bg-muted px-1 py-0.5 text-xs">essjt_school_system</code>{' '}
              database currently holds student, teacher, class, fee, mark,
              attendance, announcement and event records — but no books, no
              catalogue and no borrowing history. Rather than showing an error,
              this page will list the collection once library records are added
              to the school&apos;s data.
            </p>
            <p>
              Nothing has been invented or pre-filled: when the school adds its
              book catalogue, it will appear here automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">
          Catalogue, issues, returns and fine postings.
        </p>
      </div>
      <LibraryClient
        books={data.books}
        issues={data.issues}
        students={data.students}
        canWrite={isWriterConfigured()}
      />
    </div>
  );
}
