import { createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * The authoritative `essjt_school_system.users.password` column contains a mix
 * of formats written by different PHP entry points:
 *
 *   - 32-character hexadecimal MD5  (login.php: `md5($password) === $user['password']`)
 *   - bcrypt `$2a$` / `$2b$` / `$2y$`  (register.php: `password_hash(..., PASSWORD_DEFAULT)`)
 *
 * The legacy PHP code also accepted a plaintext equality fallback. That fallback
 * is deliberately NOT reproduced here: a stored value that is neither a valid
 * MD5 digest nor a valid bcrypt hash is rejected.
 *
 * This module performs no database access and has no side effects.
 */

const MD5_HEX = /^[0-9a-f]{32}$/i;
export const BCRYPT_HASH = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;

export type StoredPasswordFormat = 'md5' | 'bcrypt' | 'unknown';

export function detectStoredPasswordFormat(stored: string): StoredPasswordFormat {
  const value = (stored ?? '').trim();
  if (MD5_HEX.test(value)) return 'md5';
  if (BCRYPT_HASH.test(value)) return 'bcrypt';
  return 'unknown';
}

function md5Hex(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two equal-length hex strings.
 */
function hexEquals(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase(), 'utf8');
  const right = Buffer.from(b.toLowerCase(), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verify a candidate password against the stored value.
 *
 * Returns false (never throws) for unknown formats, empty input, or a malformed
 * bcrypt hash.
 */
export async function verifyStoredPassword(
  candidate: string,
  stored: string
): Promise<boolean> {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  if (typeof stored !== 'string') return false;

  const format = detectStoredPasswordFormat(stored);
  const value = stored.trim();

  if (format === 'md5') {
    return hexEquals(md5Hex(candidate), value);
  }

  if (format === 'bcrypt') {
    try {
      return await bcrypt.compare(candidate, value);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * True when a bcrypt hash should be replaced by a stronger/updated hash.
 * Not used for writes in this build: the live database is read-only here.
 */
export function needsRehash(stored: string): boolean {
  return detectStoredPasswordFormat(stored) === 'md5';
}
