'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
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
import {
  GraduationCap,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowLeft,
} from 'lucide-react';

import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_MODE_ENABLED } from '@/lib/demo-mode';

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const fillDemoCredentials = (username: string) => {
    setUsername(username);
    setPassword(DEMO_PASSWORD);
    setShowPassword(true);
    setError('');
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t('auth.invalid_credentials'));
        setLoading(false);
        return;
      }

      // Get user role and redirect to the appropriate dashboard
      const response = await fetch('/api/auth/session');
      const session = await response.json();

      if (session?.user?.role) {
        const home =
          session.user.role === 'admin'
            ? '/admin/dashboard'
            : session.user.role === 'teacher'
              ? '/teacher/dashboard'
              : session.user.role === 'student'
                ? '/student/dashboard'
                : session.user.role === 'parent'
                  ? '/parent/dashboard'
                  : '/';

        // Honour a callbackUrl set by the middleware, but only for same-site paths.
        const requested = new URLSearchParams(window.location.search).get('callbackUrl');
        const safeRequested =
          requested && requested.startsWith('/') && !requested.startsWith('//')
            ? requested
            : null;

        router.push(safeRequested ?? home);
        router.refresh();
      } else {
        setError('Unable to retrieve your account information.');
        setLoading(false);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Back Button and Language Switcher */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Link>

          <LanguageSwitcher />
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>

            <div>
              <CardTitle className="text-2xl">
                {t('auth.welcome_back')}
              </CardTitle>

              <CardDescription>
                {t('auth.sign_in_to')} ESSJT School Management System
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {DEMO_MODE_ENABLED && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <p className="font-semibold">Synthetic demo mode</p>
                <p className="mt-1">
                  Use the synthetic accounts below. Saves are disabled in
                  demo mode.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <Button
                      key={account.username}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fillDemoCredentials(account.username)}
                    >
                      {account.role}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">
                  {t('auth.username')}
                </Label>

                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('auth.password')}
                </Label>

                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
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
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                  />
                  <span className="text-muted-foreground">
                    {t('auth.remember_me')}
                  </span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-primary hover:underline"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  t('auth.login')
                )}
              </Button>
            </form>

            {/* Public self-registration entry points. */}
            <div className="mt-4 pt-4 border-t text-center space-y-1">
              <p className="text-sm">
                New student?{' '}
                <Link href="/register/student" className="text-primary hover:underline">
                  Register here
                </Link>
              </p>
              <p className="text-sm">
                New teacher?{' '}
                <Link href="/register/teacher" className="text-primary hover:underline">
                  Apply here
                </Link>
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}