'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';

interface ChangePasswordFormProps {
  role: string;
  username: string;
}

/**
 * Forced password change form.
 *
 * Identity comes from the server session (passed as props), so a user can
 * only change their own password. On success the client silently signs in
 * again with the new password to refresh the JWT (clearing the
 * mustChangePassword flag) and continues to the role home.
 */
export function ChangePasswordForm({ role, username }: ChangePasswordFormProps) {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Admin passwords cannot be changed on this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload?.ok) {
        // Refresh the JWT by signing in again with the new password, which
        // clears mustChangePassword, then continue to the role home.
        const result = await signIn('credentials', {
          username,
          password: newPassword,
          redirect: false,
        });
        if (result?.error) {
          // Fallback: end the session cleanly; the next sign-in with the new
          // password clears the flag.
          await signOut({ callbackUrl: '/login' });
          return;
        }
        const home =
          role === 'admin'
            ? '/admin/dashboard'
            : role === 'teacher'
              ? '/teacher/dashboard'
              : '/student/dashboard';
        router.push(home);
        router.refresh();
        return;
      }

      if (payload?.field) {
        setFieldErrors({ [payload.field]: payload.error });
      }
      setError(payload?.error ?? 'Password change failed. Please try again.');
      setSubmitting(false);
    } catch {
      setError('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-end mb-6">
          <LanguageSwitcher />
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Change your password</CardTitle>
              <CardDescription>
                Your account is using a temporary password. Choose a new one to
                continue.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                {fieldErrors.currentPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.currentPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10 pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {fieldErrors.newPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.newPassword}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  8–72 characters, with at least one letter and one digit.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing password…
                  </>
                ) : (
                  'Change password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
