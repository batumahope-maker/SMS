import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoReadOnlyNotice } from '@/components/demo/DemoReadOnlyNotice';
import { formatMoney } from '@/lib/format';
import {
  parentDemoChild,
  parentDemoFees,
  parentDemoOverview,
} from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export default function ParentDashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parent dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Synthetic, read-only overview for the registered child.
        </p>
      </div>

      <DemoReadOnlyNotice />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Child
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{parentDemoOverview.childName}</p>
            <p className="text-xs text-muted-foreground">
              {parentDemoOverview.studentId}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {parentDemoOverview.attendanceRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {parentDemoOverview.averageScore}/100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {formatMoney(Number(parentDemoFees.feeBalance.replace(',', '').replace(' RWF', '')))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Child details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">Full name:</span> {parentDemoChild.fullName}</p>
          <p><span className="font-medium">Student number:</span> {parentDemoChild.studentId}</p>
          <p><span className="font-medium">Class:</span> {parentDemoChild.className}</p>
          <p><span className="font-medium">Guardian relation:</span> {parentDemoChild.guardianRelation}</p>
          <p><span className="font-medium">Enrollment date:</span> {parentDemoChild.enrollmentDate}</p>
        </CardContent>
      </Card>
    </div>
  );
}
