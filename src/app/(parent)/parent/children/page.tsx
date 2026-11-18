import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="Parent portal"
      detail="The live users.role enum only contains admin, teacher and student, so there is no parent account to sign in with."
      homeHref="/login"
    />
  );
}
