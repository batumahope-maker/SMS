// Small, dependency-free helpers shared by the database tooling scripts.
//
// They never print credential values. `loadEnvFiles` reads `.env.local` and
// `.env` only to populate `process.env` for a single script run; it does not
// echo anything.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** The authoritative live database. Do not run write-capable tooling on it. */
export const LIVE_DATABASE_NAME = 'essjt_school_system';

/**
 * Populate process.env from `.env.local` and `.env` (first file wins for each
 * key, and real environment variables always win). Values are never printed.
 */
export function loadEnvFiles(root = process.cwd()) {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(root, file);
    if (!existsSync(full)) continue;

    for (const rawLine of readFileSync(full, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq < 0) continue;

      const key = line.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

/**
 * Parse DATABASE_URL without exposing credentials.
 * Returns null when the value is missing or not a URL.
 */
export function parseDatabaseUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return {
      scheme: url.protocol.replace(/:$/, '').toLowerCase(),
      host: url.hostname || null,
      port: url.port || null,
      database: decodeURIComponent(url.pathname.replace(/^\//, '')) || null,
    };
  } catch {
    return null;
  }
}

/** True when the parsed target is the authoritative live database. */
export function targetsLiveDatabase(target) {
  return Boolean(
    target &&
      target.database &&
      target.database.toLowerCase() === LIVE_DATABASE_NAME
  );
}
