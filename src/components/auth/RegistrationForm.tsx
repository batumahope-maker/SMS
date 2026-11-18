'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { GraduationCap, Loader2, ArrowLeft } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';

/**
 * Shared public registration form for students and teachers.
 *
 * The role is determined by the route this form posts to, never by a form
 * field: /api/register/student and /api/register/teacher are separate
 * server-side endpoints. The hidden `website` input is a honeypot that
 * humans never fill.
 */
export type RegistrationRole = 'student' | 'teacher';

interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'date' | 'tel';
  required?: boolean;
  placeholder?: string;
  /** Renders in the two-column grid. */
  half?: boolean;
  autoComplete?: string;
}

interface SelectDef {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
  half?: boolean;
}

const STUDENT_FIELDS: FieldDef[] = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true, half: true, autoComplete: 'name' },
  { name: 'username', label: 'Username', type: 'text', required: true, half: true, autoComplete: 'username' },
  { name: 'email', label: 'Email', type: 'email', required: true, half: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone number', type: 'tel', required: true, half: true, autoComplete: 'tel' },
  { name: 'trade', label: 'Trade', type: 'text', required: true, half: true, placeholder: 'e.g. Electrical Installation' },
  { name: 'level', label: 'Level', type: 'text', required: true, half: true, placeholder: 'e.g. Level 1' },
  { name: 'section', label: 'Section', type: 'text', required: true, half: true, placeholder: 'e.g. A' },
  { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true, half: true },
  { name: 'guardianName', label: 'Guardian name', type: 'text', required: true, half: true },
  { name: 'guardianPhone', label: 'Guardian phone', type: 'tel', required: true, half: true },
];

const STUDENT_SELECTS: SelectDef[] = [
  { name: 'gender', label: 'Gender', options: ['Male', 'Female', 'Other'], required: true, half: true },
  { name: 'enrollmentDate', label: 'Enrollment date', options: [], required: true, half: true },
];

const TEACHER_FIELDS: FieldDef[] = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true, half: true, autoComplete: 'name' },
  { name: 'username', label: 'Username', type: 'text', required: true, half: true, autoComplete: 'username' },
  { name: 'email', label: 'Email', type: 'email', required: true, half: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone number', type: 'tel', required: true, half: true, autoComplete: 'tel' },
  { name: 'subject', label: 'Subject', type: 'text', required: true, half: true },
  { name: 'department', label: 'Department', type: 'text', required: true, half: true },
];

const TEACHER_SELECTS: SelectDef[] = [
  { name: 'hireDate', label: 'Hire date', options: [], required: true, half: true },
];

const inputClasses =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2';

export function RegistrationForm({ role }: { role: RegistrationRole }) {
  const router = useRouter();
  const isStudent = role === 'student';

  const fields = isStudent ? STUDENT_FIELDS : TEACHER_FIELDS;
  const selects = isStudent ? STUDENT_SELECTS : TEACHER_SELECTS;

  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (name: string) => (value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (values.password !== values.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/register/${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website: honeypot }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload?.ok) {
        // Account created as Inactive/pending; it cannot sign in until an
        // administrator approves it.
        router.push('/register/pending');
        return;
      }

      if (payload?.fields && typeof payload.fields === 'object') {
        setFieldErrors(payload.fields as Record<string, string>);
      }
      setError(payload?.error ?? 'Registration failed. Please try again.');
      setSubmitting(false);
    } catch {
      setError('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldDef) => (
    <div key={field.name} className="space-y-2">
      <Label htmlFor={`reg-${field.name}`}>{field.label}</Label>
      <Input
        id={`reg-${field.name}`}
        type={field.type}
        placeholder={field.placeholder}
        value={values[field.name] ?? ''}
        onChange={(e) => set(field.name)(e.target.value)}
        required={field.required}
        autoComplete={field.autoComplete}
      />
      {fieldErrors[field.name] && (
        <p className="text-xs text-destructive">{fieldErrors[field.name]}</p>
      )}
    </div>
  );

  const renderSelect = (select: SelectDef) => (
    <div key={select.name} className="space-y-2">
      <Label htmlFor={`reg-${select.name}`}>{select.label}</Label>
      {select.options.length > 0 ? (
        <select
          id={`reg-${select.name}`}
          className={inputClasses}
          value={values[select.name] ?? ''}
          onChange={(e) => set(select.name)(e.target.value)}
          required={select.required}
        >
          <option value="" disabled>
            Select…
          </option>
          {select.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={`reg-${select.name}`}
          type="date"
          value={values[select.name] ?? ''}
          onChange={(e) => set(select.name)(e.target.value)}
          required={select.required}
        />
      )}
      {fieldErrors[select.name] && (
        <p className="text-xs text-destructive">{fieldErrors[select.name]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
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
                {isStudent ? 'Student Registration' : 'Teacher Registration'}
              </CardTitle>
              <CardDescription>
                {isStudent
                  ? 'Apply for a student account. An administrator will review and approve your registration.'
                  : 'Apply for a teacher account. An administrator will review and approve your registration.'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(renderField)}
                {selects.map(renderSelect)}
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={values.password ?? ''}
                    onChange={(e) => set('password')(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive">{fieldErrors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirmPassword">Confirm password</Label>
                  <Input
                    id="reg-confirmPassword"
                    type="password"
                    value={values.confirmPassword ?? ''}
                    onChange={(e) => set('confirmPassword')(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Honeypot: visually hidden; humans never fill this. */}
              <div className="absolute -left-9999px" aria-hidden="true">
                <label htmlFor="reg-website" className="sr-only">
                  Website
                </label>
                <input
                  id="reg-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit registration'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                You will not be able to sign in until an administrator approves
                your registration.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
