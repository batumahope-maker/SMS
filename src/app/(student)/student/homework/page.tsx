import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="Homework"
      detail="The live schema has no homework or homework_submissions tables."
      homeHref="/student/dashboard"
    />
  );
}
