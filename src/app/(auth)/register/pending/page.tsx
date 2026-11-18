import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Registration Received — ESSJT' };

/**
 * Confirmation shown after a successful registration submission.
 * The account exists as status=Inactive / registration_status=pending and
 * cannot sign in until an administrator approves it.
 */
export default function PendingRegistrationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 shadow-xl text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl">
            ✅
          </div>
          <CardTitle className="text-2xl">Registration received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your registration has been submitted and is now pending approval by
            an administrator. Your account stays inactive until it is approved,
            so you cannot sign in yet.
          </p>
          <p className="text-sm text-muted-foreground">
            If your registration is approved, sign in with the username/email
            and password you chose. If it is rejected, you will need to register
            again or contact the school office.
          </p>
          <Button
            asChild
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            <Link href="/login">Return to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
