/**
 * Application-level read-only guard.
 *
 * The authoritative `essjt_school_system` database must not be modified by this
 * build. The primary control is a SELECT-only database account; this module is
 * defence in depth so that a future coding mistake fails loudly instead of
 * silently writing.
 *
 * It has no database access and no side effects, so it can be unit tested.
 */

/** Prisma model operations that change data. */
export const WRITE_OPERATIONS: ReadonlySet<string> = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);

/** Raw client methods that can execute arbitrary SQL. */
export const RAW_WRITE_METHODS: ReadonlySet<string> = new Set([
  '$executeRaw',
  '$executeRawUnsafe',
  '$runCommandRaw',
]);

export class ReadOnlyDatabaseError extends Error {
  constructor(operation: string, model?: string) {
    const demoMode =
      process.env.NEXT_PUBLIC_DEMO_MODE === '1' ||
      String(process.env.NEXT_PUBLIC_DEMO_MODE ?? '').toLowerCase() === 'true';
    const reason = demoMode
      ? 'writes are disabled in demo mode. No data was saved.'
      : 'this build is read-only against the live database. ' +
        'See scripts/refuse-db-mutation.mjs.';
    super(`Refused ${operation}${model ? ` on ${model}` : ''}: ${reason}`);
    this.name = 'ReadOnlyDatabaseError';
  }
}

/** True when a Prisma model operation would write. */
export function isBlockedWrite(operation: string): boolean {
  return WRITE_OPERATIONS.has(operation);
}

/** True when a raw client method would execute SQL directly. */
export function isBlockedRawMethod(method: string): boolean {
  return RAW_WRITE_METHODS.has(method);
}
