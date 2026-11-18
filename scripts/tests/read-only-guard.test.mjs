// Unit tests for the pure read-only guard. No database connection.
//
// Node 24 strips the TypeScript types at load time.
// Run with: node --experimental-strip-types scripts/tests/read-only-guard.test.mjs

import assert from 'node:assert/strict';
import {
  ReadOnlyDatabaseError,
  isBlockedRawMethod,
  isBlockedWrite,
} from '../../src/lib/read-only-guard.ts';

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

const WRITE_OPERATIONS = [
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
];

const READ_OPERATIONS = [
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
];

for (const operation of WRITE_OPERATIONS) {
  test(`isBlockedWrite('${operation}') is true`, () => {
    assert.equal(isBlockedWrite(operation), true);
  });
}

for (const operation of READ_OPERATIONS) {
  test(`isBlockedWrite('${operation}') is false`, () => {
    assert.equal(isBlockedWrite(operation), false);
  });
}

for (const method of ['$executeRaw', '$executeRawUnsafe', '$runCommandRaw']) {
  test(`isBlockedRawMethod('${method}') is true`, () => {
    assert.equal(isBlockedRawMethod(method), true);
  });
}

for (const method of ['$queryRaw', '$queryRawUnsafe', '$transaction', '$connect']) {
  test(`isBlockedRawMethod('${method}') is false`, () => {
    assert.equal(isBlockedRawMethod(method), false);
  });
}

test('ReadOnlyDatabaseError carries a stable name and message', () => {
  const error = new ReadOnlyDatabaseError('update', 'User');
  assert.equal(error.name, 'ReadOnlyDatabaseError');
  assert.match(error.message, /read-only/);
  assert.match(error.message, /update on User/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
