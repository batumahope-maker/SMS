import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="My classes"
      detail="The live schema has no classes table. Class combinations come from school_schedule and students."
      homeHref="/teacher/dashboard"
    />
  );
}
