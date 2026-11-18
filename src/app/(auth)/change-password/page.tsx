import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Change Password — ESSJT' };

/**
 * Forced password change page. Shown to any signed-in user whose token
 * carries mustChangePassword (set when an administrator issues a temporary
 * password). Identity is resolved server-side from the session.
 */
export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    redirect('/login?callbackUrl=/change-password');
  }

  return (
    <ChangePasswordForm
      role={session.user.role ?? ''}
      username={session.user.username ?? ''}
    />
  );
}
