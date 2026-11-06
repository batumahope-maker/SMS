'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to login
        </Link>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              {sent ? <CheckCircle className="w-9 h-9 text-white" /> : <GraduationCap className="w-9 h-9 text-white" />}
            </div>
            <div>
              <CardTitle className="text-2xl">{sent ? 'Check your email' : 'Reset password'}</CardTitle>
              <CardDescription>
                {sent
                  ? `We sent a reset link to ${email}`
                  : 'Enter your email and we will send you a reset link'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                  <Mail className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly. Check your inbox and spam folder.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setSent(false); setEmail(''); }}>
                  Try a different email
                </Button>
                <Link href="/login">
                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                    Back to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send reset link'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
