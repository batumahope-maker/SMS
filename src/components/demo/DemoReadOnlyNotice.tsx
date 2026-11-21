import { AlertTriangle } from 'lucide-react';

export function DemoReadOnlyNotice() {
  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="font-semibold">Synthetic demo data</span>
      </div>
      <p className="mt-2">
        This is a read-only, synthetic Preview panel. Save actions are disabled.
      </p>
    </div>
  );
}
