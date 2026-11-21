import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DemoReadOnlyNotice } from '@/components/demo/DemoReadOnlyNotice';
import { parentDemoAttendance } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const statusBadge = (status: string) => (
  <Badge
    variant={
      status === 'Present'
        ? 'default'
        : status === 'Late'
          ? 'secondary'
          : 'destructive'
    }
  >
    {status}
  </Badge>
);

export default function ParentAttendancePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My child's attendance</h1>
        <p className="text-sm text-muted-foreground">
          Synthetic attendance records from the demo dataset.
        </p>
      </div>

      <DemoReadOnlyNotice />

      <Card>
        <CardHeader><CardTitle>Attendance records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentDemoAttendance.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                </TableRow>
              ))}
              {parentDemoAttendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No synthetic attendance records are available.
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
