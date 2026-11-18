import { Bus } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isWriterConfigured } from '@/lib/db-writer';
import { readTransportData } from '@/lib/tl-reads';
import { TransportClient } from '@/components/transport/TransportClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function TransportPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const students = await db.student.count();

  // The transport tables arrive with the approved SQL package. Until then this
  // page keeps its honest empty state; once installed (already true in the
  // staging database) it renders the full management UI wired to the verified
  // admin-only write routes.
  const { installed, data } = await readTransportData();

  if (!installed || !data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transport</h1>
          <p className="text-sm text-muted-foreground">Read-only module.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Bus className="h-5 w-5" />
              <span className="text-sm font-medium">No transport records yet</span>
            </div>
            <CardTitle>Transport has not been configured</CardTitle>
            <CardDescription>
              The live school database does not yet contain transport information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Student records ({students} currently enrolled) hold class, guardian
              and fee information, but no route, vehicle, pick-up point or
              transport assignment fields exist in the database, and there is no
              transport table. Rather than showing an error, this page will list
              routes and assignments once transport records are added to the
              school&apos;s data.
            </p>
            <p>
              Nothing has been invented or pre-filled: routes, vehicles and
              student assignments will appear here automatically when they are
              recorded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transport</h1>
        <p className="text-sm text-muted-foreground">
          Vehicles, routes, assignments and monthly transport fees.
        </p>
      </div>
      <TransportClient
        vehicles={data.vehicles}
        routes={data.routes}
        assignments={data.assignments}
        students={data.students}
        canWrite={isWriterConfigured()}
      />
    </div>
  );
}
