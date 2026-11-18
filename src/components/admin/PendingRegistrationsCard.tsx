'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PendingRegistration {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'student' | 'teacher';
  createdAt: string;
}

type Message = { kind: 'success' | 'error'; text: string };

/**
 * Pending registration queue for the admin Account Management page.
 * Approve/reject go through the admin-only server endpoints, which enforce
 * the session role server-side; the buttons themselves carry no authority.
 */
export function PendingRegistrationsCard() {
  const [registrations, setRegistrations] = useState<PendingRegistration[] | null>(
    null
  );
  const [message, setMessage] = useState<Message | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadError, setReloadError] = useState('');

  /** Pure fetch of the pending list; state is set by the caller. */
  const fetchRegistrations = useCallback(async (): Promise<PendingRegistration[]> => {
    const response = await fetch('/api/admin/registrations', {
      cache: 'no-store',
    });
    if (response.status === 401) {
      throw new Error('Your session has expired. Sign in again as an admin.');
    }
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error ?? 'Failed to load pending registrations.');
    }
    return payload.registrations ?? [];
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchRegistrations();
      setReloadError('');
      setRegistrations(data);
    } catch (error) {
      setReloadError(
        error instanceof Error ? error.message : 'Failed to load pending registrations.'
      );
      setRegistrations([]);
    }
  }, [fetchRegistrations]);

  useEffect(() => {
    let cancelled = false;
    fetchRegistrations()
      .then((data) => {
        if (cancelled) return;
        setRegistrations(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setReloadError(
          error instanceof Error
            ? error.message
            : 'Failed to load pending registrations.'
        );
        setRegistrations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRegistrations]);

  const act = async (
    registration: PendingRegistration,
    action: 'approve' | 'reject'
  ) => {
    setBusyId(registration.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/registrations/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: registration.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.ok) {
        setMessage({
          kind: 'success',
          text:
            action === 'approve'
              ? `Approved ${registration.username} — the account is now Active and can sign in.`
              : `Rejected ${registration.username} — the account stays inactive and cannot sign in.`,
        });
        await load();
      } else {
        setMessage({
          kind: 'error',
          text: payload?.error ?? 'The action failed. Please try again.',
        });
      }
    } catch {
      setMessage({ kind: 'error', text: 'The action failed. Please try again.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Pending registrations
              {registrations && registrations.length > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200">
                  {registrations.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              New student and teacher applications. Approving activates the
              account; rejecting leaves it inactive.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {message && (
          <Alert variant={message.kind === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}
        {reloadError && (
          <Alert variant="destructive">
            <AlertDescription>{reloadError}</AlertDescription>
          </Alert>
        )}

        {registrations === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending registrations. (Also empty until the approved live
            schema change adds the registration status column.)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-mono text-xs">
                      {registration.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {registration.username}
                    </TableCell>
                    <TableCell>{registration.fullName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {registration.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{registration.email}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(registration.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          disabled={busyId !== null}
                          onClick={() => void act(registration, 'approve')}
                        >
                          {busyId === registration.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId !== null}
                          onClick={() => void act(registration, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
