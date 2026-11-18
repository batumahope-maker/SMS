'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface AccountActionsProps {
  userId: number;
  role: string;
}

/**
 * Per-row admin action: issue a temporary password for a student or teacher
 * account. The one-time password is shown in a dialog only; it is never
 * stored client-side or logged.
 */
export function AccountActions({ userId, role }: AccountActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const resetPassword = async () => {
    setBusy(true);
    setError('');
    setTemporaryPassword(null);
    try {
      const response = await fetch(`/api/admin/accounts/${userId}/reset-password`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.ok) {
        setTemporaryPassword(payload.temporaryPassword as string);
        router.refresh();
      } else {
        setError(payload?.error ?? 'The reset failed. Please try again.');
      }
    } catch {
      setError('The reset failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (role !== 'student' && role !== 'teacher') {
    // Only student/teacher accounts are resettable; admins render nothing.
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void resetPassword()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
        </Button>
        {error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}
      </div>

      <Dialog
        open={temporaryPassword !== null}
        onOpenChange={(open) => {
          if (!open) setTemporaryPassword(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password issued</DialogTitle>
            <DialogDescription>
              Copy it now — this is the only time it is shown. The user will be
              required to change it at their next sign-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <code className="block rounded-md border bg-muted px-3 py-2 font-mono text-sm select-all">
              {temporaryPassword}
            </code>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (temporaryPassword) {
                    void navigator.clipboard.writeText(temporaryPassword);
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
