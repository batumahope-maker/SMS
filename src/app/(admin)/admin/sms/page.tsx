import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="SMS"
      detail="SMS dispatch is disabled in this build, and no personal data is sent to external services."
      homeHref="/admin/dashboard"
    />
  );
}
