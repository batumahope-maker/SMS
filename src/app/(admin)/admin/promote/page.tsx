import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="Student promotion"
      detail="Promotion needs academic-year and class tables that do not exist, and it would write to the live database."
      homeHref="/admin/dashboard"
    />
  );
}
