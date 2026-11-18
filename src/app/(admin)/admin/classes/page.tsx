import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
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

export default async function ClassesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  // The live schema has no classes table: a class is the combination of
  // trade, level and section on the students profile. Derive it read-only.
  const groups = await db.student.groupBy({
    by: ['trade', 'level', 'section'],
    _count: { _all: true },
    orderBy: [
      { trade: 'asc' },
      { level: 'asc' },
      { section: 'asc' },
    ],
  });

  const totalStudents = await db.student.count();

  const label = (g: { trade: string | null; level: string | null; section: string | null }) =>
    [g.trade, g.level, g.section].filter(Boolean).join(' ') || '(no class assigned)';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view. Classes are derived from the live{' '}
          <code>students</code> table (trade + level + section).{' '}
          {totalStudents} students in {groups.length} groups.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class (trade · level · section)</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={`${group.trade ?? ''}|${group.level ?? ''}|${group.section ?? ''}`}>
                    <TableCell className="font-medium">{label(group)}</TableCell>
                    <TableCell className="text-right">{group._count._all}</TableCell>
                  </TableRow>
                ))}
                {groups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No student records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
