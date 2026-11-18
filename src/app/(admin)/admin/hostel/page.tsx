import { ModuleUnavailable } from '@/components/ModuleUnavailable';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleUnavailable
      title="Hostel"
      detail="The live schema has no rooms or room_allocations tables."
      homeHref="/admin/dashboard"
    />
  );
}
