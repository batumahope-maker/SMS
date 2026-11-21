import { PrismaClient } from '@prisma/client';
import { demoDb } from './demo-db';
import { isDemoMode } from './demo-mode';
import {
  ReadOnlyDatabaseError,
  isBlockedRawMethod,
  isBlockedWrite,
} from './read-only-guard';

/**
 * Prisma client for the authoritative MySQL database.
 *
 * Two layers keep this build read-only:
 *   1. the database account should be SELECT-only (verify with
 *      `npm run db:verify-readonly`);
 *   2. this client refuses every write operation and every raw execution
 *      method before a query can reach the database.
 *
 * Read operations (`findMany`, `findFirst`, `count`, `groupBy`, `$queryRaw`, …)
 * pass through unchanged.
 */
function createLiveClient() {
  const base = new PrismaClient();

  const guarded = base.$extends({
    query: {
      $allOperations({ operation, model, args, query }) {
        if (isBlockedWrite(operation)) {
          throw new ReadOnlyDatabaseError(operation, model);
        }
        return query(args);
      },
    },
  });

  // `$executeRaw*` and `$runCommandRaw` are not model operations, so the query
  // extension above does not see them. Intercept them on the client itself.
  return new Proxy(guarded, {
    get(target, property) {
      if (typeof property === 'string' && isBlockedRawMethod(property)) {
        return () => {
          throw new ReadOnlyDatabaseError(property);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function createClient() {
  // Demo mode must short-circuit before Prisma reads DATABASE_URL. The current
  // Preview failure ("URL must start with mysql://") is avoided entirely.
  if (isDemoMode()) return demoDb as ReturnType<typeof createLiveClient>;
  return createLiveClient();
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createLiveClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
