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
    super(
      `Refused ${operation}${model ? ` on ${model}` : ''}: ` +
        'this build is read-only against the live database. ' +
        'See scripts/refuse-db-mutation.mjs.'
    );
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
