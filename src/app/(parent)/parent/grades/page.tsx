import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DemoReadOnlyNotice } from '@/components/demo/DemoReadOnlyNotice';
import { parentDemoMarks } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export default function ParentGradesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My child's grades</h1>
        <p className="text-sm text-muted-foreground">
          Synthetic marks for the registered child.
        </p>
      </div>

      <DemoReadOnlyNotice />

      <Card>
        <CardHeader><CardTitle>Synthetic marks</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentDemoMarks.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.subject}</TableCell>
                  <TableCell>{row.term}</TableCell>
                  <TableCell className="text-right">
                    {row.score}/{row.maxScore}
                  </TableCell>
                </TableRow>
              ))}
              {parentDemoMarks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No synthetic marks are available yet.
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
