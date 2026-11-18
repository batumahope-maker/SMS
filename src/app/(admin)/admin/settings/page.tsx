import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="Settings"
      detail="The live schema has no settings or schools table."
      homeHref="/admin/dashboard"
    />
  );
}
