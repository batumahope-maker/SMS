import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoReadOnlyNotice } from '@/components/demo/DemoReadOnlyNotice';
import { parentDemoMessages } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export default function ParentMessagesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My child's messages</h1>
        <p className="text-sm text-muted-foreground">
          Synthetic teacher and admin messages shown in Preview.
        </p>
      </div>

      <DemoReadOnlyNotice />

      <div className="space-y-4">
        {parentDemoMessages.map((message) => (
          <Card key={message.id}>
            <CardHeader>
              <CardTitle>{message.subject}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">From:</span> {message.from}
              </p>
              <p>
                <span className="font-medium">Date:</span> {message.date}
              </p>
              <p>{message.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
