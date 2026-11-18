import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="AI analysis"
      detail="AI analysis depends on tables that are not present in the live schema."
      homeHref="/admin/dashboard"
    />
  );
}
