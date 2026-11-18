// Pure auditing logic for `SHOW GRANTS` output.
//
// Kept separate from the database connection so it can be unit tested with
// synthetic grant strings. It never connects to anything.

import { LIVE_DATABASE_NAME } from './env.mjs';

/** Privileges that a read-only application account may hold. */
export const ALLOWED_PRIVILEGES = new Set(['USAGE', 'SELECT', 'SHOW VIEW']);

/**
 * Privileges that change data, structure, accounts or server state, or that
 * can be used to escalate. The allow-list above is the real gate; this set only
 * produces a clearer failure message.
 */
export const FORBIDDEN_PRIVILEGES = new Set([
  // Data and schema writes
  'ALL PRIVILEGES',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'INDEX',
  'REFERENCES',
  'TRUNCATE',
  'CREATE TEMPORARY TABLES',
  'CREATE VIEW',
  'CREATE ROUTINE',
  'ALTER ROUTINE',
  'EVENT',
  'TRIGGER',
  'LOCK TABLES',
  'EXECUTE',
  'GRANT OPTION',
  'PROXY',
  // Server, account and replication administration
  'SUPER',
  'FILE',
  'PROCESS',
  'RELOAD',
  'SHUTDOWN',
  'CREATE USER',
  'CREATE ROLE',
  'DROP ROLE',
  'CREATE TABLESPACE',
  'SYSTEM_USER',
  'SYSTEM_VARIABLES_ADMIN',
  'SESSION_VARIABLES_ADMIN',
  'PERSIST_RO_VARIABLES_ADMIN',
  'BACKUP_ADMIN',
  'BINLOG_ADMIN',
  'BINLOG_ENCRYPTION_ADMIN',
  'BINLOG_MONITOR',
  'CLONE_ADMIN',
  'CONNECTION_ADMIN',
  'ROLE_ADMIN',
  'SET_USER_ID',
  'PASSWORDLESS_USER_ADMIN',
  'APPLICATION_PASSWORD_ADMIN',
  'AUDIT_ADMIN',
  'ENCRYPTION_KEY_ADMIN',
  'TABLE_ENCRYPTION_ADMIN',
  'RESOURCE_GROUP_ADMIN',
  'RESOURCE_GROUP_USER',
  'XA_RECOVER_ADMIN',
  'SERVICE_CONNECTION_ADMIN',
  'GROUP_REPLICATION_ADMIN',
  'GROUP_REPLICATION_STREAM',
  'REPLICATION APPLIER',
  'REPLICATION SLAVE',
  'REPLICATION CLIENT',
  'REPLICATION MASTER ADMIN',
  'REPLICATION SLAVE ADMIN',
  'INNODB_REDO_LOG_ARCHIVE',
  'INNODB_REDO_LOG_ENABLE',
  'SHOW_ROUTINE',
  'SET_ANY_DEFINER',
  'FLUSH_OPTIMIZER_COSTS',
  'FLUSH_STATUS',
  'FLUSH_TABLES',
  'FLUSH_USER_RESOURCES',
  'ADMIN',
  'DELETE HISTORY',
  'BINLOG MONITOR',
  'SET USER',
  'SHOW CREATE ROUTINE',
]);

const GRANT_PATTERN = /^GRANT\s+(.+?)\s+ON\s+(.+?)\s+TO\s+/i;

/**
 * Remove password hashes from a grant line before it is printed or stored.
 * Older MySQL/MariaDB versions include `IDENTIFIED BY PASSWORD '*hash'`.
 */
export function redactGrant(grant) {
  return String(grant)
    .replace(
      /IDENTIFIED\s+BY\s+PASSWORD\s+'[^']*'/gi,
      "IDENTIFIED BY PASSWORD '<redacted>'"
    )
    .replace(
      /IDENTIFIED\s+VIA\s+\S+\s+USING\s+'[^']*'/gi,
      "IDENTIFIED VIA ... USING '<redacted>'"
    )
    .replace(/IDENTIFIED\s+BY\s+'[^']*'/gi, "IDENTIFIED BY '<redacted>'");
}

/**
 * Audit grant statements.
 *
 * @param {string[]} rawGrants rows from `SHOW GRANTS FOR CURRENT_USER()`
 * @param {{ expectedDatabase?: string }} options
 * @returns {{ failures: string[], warnings: string[], privileges: string[], grants: string[] }}
 */
export function auditGrants(
  rawGrants,
  { expectedDatabase = LIVE_DATABASE_NAME } = {}
) {
  const failures = [];
  const warnings = [];
  const privileges = new Set();
  const grants = [];
  let selectOnExpectedDatabase = false;

  if (!rawGrants || rawGrants.length === 0) {
    return {
      failures: ['SHOW GRANTS returned no rows; cannot verify privileges.'],
      warnings,
      privileges: [],
      grants,
    };
  }

  for (const raw of rawGrants) {
    const grant = redactGrant(raw);
    grants.push(grant);

    if (/WITH\s+GRANT\s+OPTION/i.test(grant)) {
      failures.push(
        `"${grant}" includes WITH GRANT OPTION, so the account can grant its own privileges.`
      );
      continue;
    }

    const match = grant.match(GRANT_PATTERN);
    if (!match) {
      if (/^GRANT\s+.+\s+TO\s+/i.test(grant)) {
        failures.push(
          `"${grant}" looks like a role grant; roles can hide write privileges.`
        );
      } else {
        failures.push(`Unrecognised grant statement: "${grant}".`);
      }
      continue;
    }

    // Column-level grants look like `SELECT (id, name) ON ...`; drop the
    // column list so it is not mistaken for a privilege name.
    const privilegeText = match[1].replace(/\([^)]*\)/g, ' ');
    const scope = match[2].replace(/`/g, '').trim();
    const scopeDatabase = scope.split('.')[0] || '(unknown)';
    const scopeIsWildcard = scopeDatabase === '*';

    for (const rawPrivilege of privilegeText.split(',')) {
      const privilege = rawPrivilege.trim().toUpperCase();
      if (!privilege) continue;
      privileges.add(privilege);

      if (!ALLOWED_PRIVILEGES.has(privilege)) {
        const reason = FORBIDDEN_PRIVILEGES.has(privilege)
          ? `Account holds the "${privilege}" privilege`
          : `Unexpected privilege "${privilege}" (only USAGE, SELECT and SHOW VIEW are allowed)`;
        failures.push(`${reason} on scope "${scope}".`);
        continue;
      }

      if (privilege === 'SELECT') {
        if (scopeIsWildcard) {
          failures.push(
            'SELECT on *.* can read credential hashes in mysql.*; ' +
              `grant SELECT only on ${expectedDatabase}.*.`
          );
        } else if (scopeDatabase.toLowerCase() === 'mysql') {
          failures.push(
            'SELECT on mysql.* can read credential hashes; ' +
              `grant SELECT only on ${expectedDatabase}.*.`
          );
        } else if (
          scopeDatabase.toLowerCase() === expectedDatabase.toLowerCase()
        ) {
          selectOnExpectedDatabase = true;
        } else {
          warnings.push(
            `SELECT on "${scopeDatabase}" is outside ${expectedDatabase}; confirm this is intentional.`
          );
        }
      }
    }
  }

  if (!selectOnExpectedDatabase) {
    failures.push(
      `No SELECT grant on ${expectedDatabase}.*; the application could not read its own data.`
    );
  }

  return {
    failures,
    warnings,
    privileges: [...privileges].sort(),
    grants,
  };
}
