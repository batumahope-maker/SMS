import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoReadOnlyNotice } from '@/components/demo/DemoReadOnlyNotice';
import { parentDemoChild } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export default function ParentChildrenPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My children</h1>
        <p className="text-sm text-muted-foreground">
          Synthetic child registered to this demo parent account.
        </p>
      </div>

      <DemoReadOnlyNotice />

      <Card>
        <CardHeader><CardTitle>Synthetic child</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p><span className="font-medium">Full name:</span> {parentDemoChild.fullName}</p>
          <p><span className="font-medium">Student number:</span> {parentDemoChild.studentId}</p>
          <p><span className="font-medium">Class:</span> {parentDemoChild.className}</p>
          <p><span className="font-medium">Parent user ID:</span> {String(parentDemoChild.parentId)}</p>
          <p><span className="font-medium">Student user ID:</span> {String(parentDemoChild.studentUserId)}</p>
          <p><span className="font-medium">Guardian relation:</span> {parentDemoChild.guardianRelation}</p>
        </CardContent>
      </Card>
    </div>
  );
}
