import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const events = await db.schoolEvent.findMany({
    orderBy: [{ eventDate: 'asc' }, { id: 'asc' }],
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>school_events</code> table.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title ?? '—'}</TableCell>
                  <TableCell>{formatDate(event.eventDate)}</TableCell>
                  <TableCell>{event.eventType ?? '—'}</TableCell>
                  <TableCell>{event.location ?? '—'}</TableCell>
                  <TableCell>{event.isActive ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No events found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
