import { Sparkles } from 'lucide-react';
import { DEMO_MODE_ENABLED } from '@/lib/demo-mode';

export function DemoBanner() {
  if (!DEMO_MODE_ENABLED) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="font-semibold">Synthetic demo mode</span>
        <span className="hidden sm:block">
          · All data is synthetic. Saves are disabled.
        </span>
      </div>
    </div>
  );
}
