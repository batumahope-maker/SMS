import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="Lesson plans"
      detail="The live schema has no lesson plan or syllabus tables."
      homeHref="/teacher/dashboard"
    />
  );
}
