// Unit tests for the pure grant auditor. No database connection.
//
// Run with: node scripts/tests/grant-audit.test.mjs

import assert from 'node:assert/strict';
import { auditGrants, redactGrant } from '../lib/grant-audit.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n     ${error.message}`);
  }
}

const READONLY = [
  "GRANT USAGE ON *.* TO 'essjt_readonly'@'localhost'",
  "GRANT SELECT ON `essjt_school_system`.* TO 'essjt_readonly'@'localhost'",
];

function audit(grants, options) {
  return auditGrants(grants, options);
}

test('SELECT-only account passes', () => {
  const result = audit(READONLY);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.privileges, ['SELECT', 'USAGE']);
});

test('SELECT + SHOW VIEW passes', () => {
  const result = audit([
    ...READONLY,
    "GRANT SHOW VIEW ON `essjt_school_system`.* TO 'essjt_readonly'@'localhost'",
  ]);
  assert.deepEqual(result.failures, []);
});

test('column-level SELECT is not mistaken for a privilege', () => {
  const result = audit([
    "GRANT USAGE ON *.* TO 'u'@'localhost'",
    "GRANT SELECT (id, name) ON `essjt_school_system`.`users` TO 'u'@'localhost'",
  ]);
  assert.deepEqual(result.failures, []);
});

test('INSERT is rejected', () => {
  const result = audit([
    "GRANT SELECT, INSERT ON `essjt_school_system`.* TO 'u'@'localhost'",
  ]);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /INSERT/);
});

test('ALL PRIVILEGES is rejected', () => {
  const result = audit(["GRANT ALL PRIVILEGES ON *.* TO 'u'@'localhost'"]);
  assert.ok(result.failures.some((line) => /ALL PRIVILEGES/.test(line)));
});

test('SELECT on *.* is rejected (can read mysql.* hashes)', () => {
  const result = audit(["GRANT SELECT ON *.* TO 'u'@'localhost'"]);
  assert.ok(result.failures.some((line) => /credential hashes/.test(line)));
});

test('SELECT on mysql.* is rejected', () => {
  const result = audit([
    ...READONLY,
    "GRANT SELECT ON `mysql`.* TO 'u'@'localhost'",
  ]);
  assert.ok(result.failures.some((line) => /mysql\.\*/.test(line)));
});

test('SELECT outside the expected database is only a warning', () => {
  const result = audit([
    ...READONLY,
    "GRANT SELECT ON `other_db`.* TO 'u'@'localhost'",
  ]);
  assert.deepEqual(result.failures, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /other_db/);
});

test('EXECUTE is rejected (definer procedures can write)', () => {
  const result = audit([
    ...READONLY,
    "GRANT EXECUTE ON `essjt_school_system`.* TO 'u'@'localhost'",
  ]);
  assert.ok(result.failures.some((line) => /EXECUTE/.test(line)));
});

test('WITH GRANT OPTION is rejected', () => {
  const result = audit([
    "GRANT SELECT ON `essjt_school_system`.* TO 'u'@'localhost' WITH GRANT OPTION",
  ]);
  assert.ok(result.failures.some((line) => /GRANT OPTION/.test(line)));
});

test('role grants are rejected', () => {
  const result = audit([
    ...READONLY,
    "GRANT 'essjt_admin'@'%' TO 'u'@'localhost'",
  ]);
  assert.ok(result.failures.some((line) => /role grant/.test(line)));
});

test('CREATE TEMPORARY TABLES is rejected', () => {
  const result = audit([
    ...READONLY,
    "GRANT CREATE TEMPORARY TABLES ON `essjt_school_system`.* TO 'u'@'localhost'",
  ]);
  assert.ok(result.failures.some((line) => /CREATE TEMPORARY TABLES/.test(line)));
});

test('PROXY is rejected', () => {
  const result = audit([
    ...READONLY,
    "GRANT PROXY ON ''@'' TO 'u'@'localhost'",
  ]);
  assert.ok(result.failures.some((line) => /PROXY/.test(line)));
});

test('unknown privileges are rejected (allow-list)', () => {
  const result = audit([
    ...READONLY,
    "GRANT FLUSH_TABLES ON *.* TO 'u'@'localhost'",
  ]);
  assert.ok(result.failures.some((line) => /FLUSH_TABLES/.test(line)));
});

test('USAGE without SELECT on the app database is rejected', () => {
  const result = audit(["GRANT USAGE ON *.* TO 'u'@'localhost'"]);
  assert.ok(result.failures.some((line) => /No SELECT grant/.test(line)));
});

test('empty grant list is rejected', () => {
  const result = audit([]);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /no rows/i);
});

test('unrecognised statements are rejected', () => {
  const result = audit([
    ...READONLY,
    "REVOKE ALL PRIVILEGES ON *.* FROM 'u'@'localhost'",
  ]);
  assert.ok(result.failures.some((line) => /Unrecognised/.test(line)));
});

test('password hashes are redacted', () => {
  const grant =
    "GRANT USAGE ON *.* TO 'u'@'localhost' IDENTIFIED BY PASSWORD '*0123456789ABCDEF'";
  const redacted = redactGrant(grant);
  assert.doesNotMatch(redacted, /0123456789ABCDEF/);
  assert.match(redacted, /<redacted>/);

  const result = audit([grant]);
  assert.ok(result.grants.every((line) => !line.includes('0123456789ABCDEF')));
});

test('IDENTIFIED VIA ... USING is redacted', () => {
  const grant =
    "GRANT USAGE ON *.* TO 'u'@'localhost' IDENTIFIED VIA mysql_native_password USING '*DEADBEEF'";
  const redacted = redactGrant(grant);
  assert.doesNotMatch(redacted, /DEADBEEF/);
});

test('expected database can be overridden for a staging target', () => {
  const result = audit(
    ["GRANT SELECT ON `essjt_staging`.* TO 'u'@'localhost'"],
    { expectedDatabase: 'essjt_staging' }
  );
  assert.deepEqual(result.failures, []);

  const liveGrant = audit(
    ["GRANT SELECT ON `essjt_school_system`.* TO 'u'@'localhost'"],
    { expectedDatabase: 'essjt_staging' }
  );
  assert.equal(liveGrant.warnings.length, 1);
  assert.match(liveGrant.warnings[0], /outside essjt_staging/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
