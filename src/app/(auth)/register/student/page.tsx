import { RegistrationForm } from '@/components/auth/RegistrationForm';

export const metadata = { title: 'Student Registration — ESSJT' };

export default function StudentRegistrationPage() {
  // The role is fixed by this server-side route; the client form cannot
  // change it.
  return <RegistrationForm role="student" />;
}
