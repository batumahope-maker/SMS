import { RegistrationForm } from '@/components/auth/RegistrationForm';

export const metadata = { title: 'Teacher Registration — ESSJT' };

export default function TeacherRegistrationPage() {
  // The role is fixed by this server-side route; the client form cannot
  // change it.
  return <RegistrationForm role="teacher" />;
}
