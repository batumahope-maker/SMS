/**
 * In-memory, read-only Prisma-shaped client used only by synthetic demo mode.
 *
 * It never opens a network connection and never reads DATABASE_URL. Reads are
 * answered from src/lib/demo-data.ts; every write is refused before any state
 * could change. The surface is intentionally limited to the Prisma operations
 * used by the existing pages and API routes.
 */
import { DEMO_WRITE_DISABLED_MESSAGE } from './demo-mode';
import { demoData } from './demo-data';

type DemoRow = Record<string, unknown>;
type QueryArgs = Record<string, unknown> | undefined;

export class DemoReadOnlyError extends Error {
  readonly code = 'DEMO_READ_ONLY';

  constructor(operation: string, model?: string) {
    super(
      `${DEMO_WRITE_DISABLED_MESSAGE} Refused ${operation}${model ? ` on ${model}` : ''}.`
    );
    this.name = 'DemoReadOnlyError';
  }
}

function getRows(model: string): DemoRow[] {
  return (demoData as unknown as Record<string, DemoRow[]>)[model] ?? [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

function toComparable(value: unknown): unknown {
  if (value instanceof Date) return value.getTime();
  if (value !== null && typeof value === 'object') {
    const asDecimal = value as { toString?: () => string };
    if (typeof asDecimal.toString === 'function') {
      const numeric = Number(asDecimal.toString());
      if (!Number.isNaN(numeric)) return numeric;
    }
  }
  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left instanceof Date) {
    const candidate = right instanceof Date ? right : new Date(String(right));
    return !Number.isNaN(candidate.getTime()) && left.getTime() === candidate.getTime();
  }
  if (right instanceof Date) {
    const candidate = left instanceof Date ? left : new Date(String(left));
    return !Number.isNaN(candidate.getTime()) && candidate.getTime() === right.getTime();
  }
  const a = toComparable(left);
  const b = toComparable(right);
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  return a === b;
}

function compareValues(left: unknown, right: unknown): number {
  const a = toComparable(left);
  const b = toComparable(right);
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition === undefined) return true;
  if (condition === null) return value === null || value === undefined;
  if (Array.isArray(condition)) {
    return condition.some((item) => matchesCondition(value, item));
  }

  if (isPlainObject(condition)) {
    const op = condition as Record<string, unknown>;

    if ('equals' in op) return valuesEqual(value, op.equals);
    if ('in' in op && Array.isArray(op.in)) {
      return op.in.some((item) => valuesEqual(value, item));
    }
    if ('notIn' in op && Array.isArray(op.notIn)) {
      return !op.notIn.some((item) => valuesEqual(value, item));
    }
    if ('isNull' in op) {
      return op.isNull === true ? value === null || value === undefined : value != null;
    }
    if ('contains' in op) {
      return String(value ?? '').toLowerCase().includes(String(op.contains).toLowerCase());
    }
    if ('startsWith' in op) {
      return String(value ?? '').toLowerCase().startsWith(String(op.startsWith).toLowerCase());
    }
    if ('endsWith' in op) {
      return String(value ?? '').toLowerCase().endsWith(String(op.endsWith).toLowerCase());
    }
    if ('not' in op) return !matchesCondition(value, op.not);

    const comparableValue = toComparable(value);
    if ('gt' in op) return Number(comparableValue) > Number(op.gt);
    if ('gte' in op) return Number(comparableValue) >= Number(op.gte);
    if ('lt' in op) return Number(comparableValue) < Number(op.lt);
    if ('lte' in op) return Number(comparableValue) <= Number(op.lte);
  }

  return valuesEqual(value, condition);
}

function matchesWhere(row: DemoRow, where: unknown): boolean {
  if (!where || !isPlainObject(where)) return true;

  return Object.entries(where).every(([key, condition]) => {
    if (key === 'AND' && Array.isArray(condition)) {
      return condition.every((part) => matchesWhere(row, part));
    }
    if (key === 'OR' && Array.isArray(condition)) {
      return condition.some((part) => matchesWhere(row, part));
    }
    if (key === 'NOT') return !matchesWhere(row, condition);
    return matchesCondition(row[key], condition);
  });
}

function sortRows(rows: DemoRow[], orderBy: unknown): DemoRow[] {
  if (!orderBy) return rows;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sorted = [...rows];

  sorted.sort((left, right) => {
    for (const order of orders) {
      if (!isPlainObject(order)) continue;
      for (const [field, direction] of Object.entries(order)) {
        const result = compareValues(left[field], right[field]);
        if (result !== 0) return direction === 'desc' ? -result : result;
      }
    }
    return 0;
  });

  return sorted;
}

interface RelationResult {
  model: string;
  list: boolean;
  rows: DemoRow[];
}

function relationFor(model: string, field: string, row: DemoRow): RelationResult | null {
  const id = row.id;
  const rel = (relModel: string, list: boolean, rows: DemoRow[]): RelationResult => ({
    model: relModel,
    list,
    rows,
  });

  switch (`${model}.${field}`) {
    case 'user.student':
      return rel(
        'student',
        false,
        getRows('student').filter((item) => item.userId === id)
      );
    case 'user.teacher':
      return rel(
        'teacher',
        false,
        getRows('teacher').filter((item) => item.userId === id)
      );
    case 'user.admin':
      return rel('admin', false, getRows('admin').filter((item) => item.userId === id));
    case 'user.attendanceRecords':
      return rel(
        'attendance',
        true,
        getRows('attendance').filter((item) => item.studentId === id)
      );
    case 'user.marks':
      return rel('mark', true, getRows('mark').filter((item) => item.studentId === id));
    case 'user.payments':
      return rel('payment', true, getRows('payment').filter((item) => item.studentId === id));
    case 'user.announcements':
      return rel(
        'announcement',
        true,
        getRows('announcement').filter((item) => item.createdBy === id)
      );
    case 'user.schedules':
      return rel(
        'schoolSchedule',
        true,
        getRows('schoolSchedule').filter((item) => item.teacherId === id)
      );
    case 'student.user':
    case 'teacher.user':
    case 'admin.user':
      return rel('user', false, getRows('user').filter((item) => item.id === row.userId));
    case 'attendance.student':
    case 'mark.student':
    case 'payment.student':
      return rel('user', false, getRows('user').filter((item) => item.id === row.studentId));
    case 'schoolSchedule.teacher':
      return rel('user', false, getRows('user').filter((item) => item.id === row.teacherId));
    case 'announcement.author':
      return rel('user', false, getRows('user').filter((item) => item.id === row.createdBy));
    default:
      return null;
  }
}

function runQuery(model: string, args: QueryArgs = {}, baseRows?: DemoRow[]): DemoRow[] {
  let rows = baseRows ?? getRows(model);
  rows = rows.filter((row) => matchesWhere(row, args?.where));
  rows = sortRows(rows, args?.orderBy);

  if (typeof args?.skip === 'number' && args.skip > 0) {
    rows = rows.slice(args.skip);
  }
  if (typeof args?.take === 'number' && args.take >= 0) {
    rows = rows.slice(0, args.take);
  }

  return rows.map((row) => projectRow(row, model, args));
}

function projectRelation(relation: RelationResult, args: QueryArgs): unknown {
  const rows = runQuery(relation.model, args ?? {}, relation.rows);
  return relation.list ? rows : (rows[0] ?? null);
}

function projectRow(row: DemoRow, model: string, args: QueryArgs = {}): DemoRow {
  const select = args?.select;
  const include = args?.include;

  if (isPlainObject(select)) {
    const result: DemoRow = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (!enabled) continue;
      const relation = relationFor(model, key, row);

      if (isPlainObject(enabled) && relation) {
        result[key] = projectRelation(relation, enabled as QueryArgs);
        continue;
      }
      if (key in row) {
        result[key] = row[key];
        continue;
      }
      if (relation) result[key] = projectRelation(relation, {});
    }
    return result;
  }

  const result: DemoRow = { ...row };
  if (isPlainObject(include)) {
    for (const [key, config] of Object.entries(include)) {
      if (!config) continue;
      const relation = relationFor(model, key, row);
      if (!relation) continue;
      result[key] = projectRelation(relation, config === true ? {} : (config as QueryArgs));
    }
  }
  return result;
}

function refused(operation: string, model?: string): never {
  throw new DemoReadOnlyError(operation, model);
}

function sumField(rows: DemoRow[], field: string): number {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

function rawQuery(sqlInput: unknown, values: unknown[] = []): DemoRow[] {
  let sql = '';
  if (Array.isArray(sqlInput)) {
    for (let i = 0; i < sqlInput.length; i += 1) {
      sql += String(sqlInput[i]);
      if (i < values.length) sql += '?';
    }
  } else {
    sql = String(sqlInput ?? '');
  }
  const normalized = sql.replace(/\s+/g, ' ').trim();

  const users = getRows('user');
  const students = getRows('student');
  const marks = getRows('mark');
  const schedules = getRows('schoolSchedule');
  const payments = getRows('payment');

  if (normalized.includes("registration_status = 'pending'")) return [];

  if (normalized.includes('must_change_password') && normalized.includes('WHERE id = ?')) {
    const user = users.find((row) => Number(row.id) === Number(values[0]));
    return [
      {
        must_change_password: user?.mustChangePassword === true ? 1 : 0,
        registration_status: user?.registrationStatus ?? null,
      },
    ];
  }

  if (normalized.includes('must_change_password FROM users LIMIT 1')) {
    return [{ must_change_password: 0, registration_status: null }];
  }

  if (normalized.includes('SELECT DISTINCT trade, level, section')) {
    const classes = new Set(
      students.map((row) => `${row.trade ?? ''}|${row.level ?? ''}|${row.section ?? ''}`)
    );
    return [{ total: classes.size }];
  }

  if (normalized.includes('SELECT subject FROM marks')) {
    const subjects = new Set(
      [...marks, ...schedules]
        .map((row) => row.subject)
        .filter((subject): subject is string => typeof subject === 'string' && subject.length > 0)
    );
    return [{ total: subjects.size }];
  }

  if (normalized.includes('SUM(amount)')) {
    return [{ total: sumField(payments, 'amount') }];
  }

  if (normalized.includes('SUM(fee_balance)')) {
    return [{ total: sumField(students, 'feeBalance') }];
  }

  if (normalized.includes('FROM payments p')) {
    return [...payments]
      .sort((left, right) => {
        const dateCompare = compareValues(right.paymentDate, left.paymentDate);
        return dateCompare !== 0 ? dateCompare : compareValues(right.id, left.id);
      })
      .slice(0, 5)
      .map((payment) => {
        const user = users.find((item) => item.id === payment.studentId);
        const student = students.find((item) => item.userId === payment.studentId);
        return {
          id: payment.id,
          amount: payment.amount,
          reference: payment.reference,
          payment_date: payment.paymentDate,
          full_name: user?.fullName ?? 'Demo Student',
          username: user?.username ?? 'demo.student',
          student_id: student?.studentId ?? 'DEMO-S-1001',
        };
      });
  }

  if (
    normalized.includes("u.role = 'student'") &&
    normalized.includes('u.full_name AS student_name')
  ) {
    return students.map((student) => {
      const user = users.find((item) => item.id === student.userId);
      return {
        user_id: student.userId,
        student_name: user?.fullName ?? 'Demo Student',
        student_code: student.studentId ?? null,
      };
    });
  }

  // Transport/library admin tables are not part of the synthetic demo set.
  // Returning an empty list keeps their read-only screens renderable.
  return [];
}

function aggregate(model: string, args: QueryArgs = {}): DemoRow {
  const rows = getRows(model).filter((row) => matchesWhere(row, args?.where));
  const result: DemoRow = {};

  if (isPlainObject(args?._sum)) {
    const sums: DemoRow = {};
    for (const field of Object.keys(args._sum)) {
      sums[field] = sumField(rows, field);
    }
    result._sum = sums;
  }

  if (isPlainObject(args?._avg)) {
    const averages: DemoRow = {};
    for (const field of Object.keys(args._avg)) {
      averages[field] = rows.length ? sumField(rows, field) / rows.length : 0;
    }
    result._avg = averages;
  }

  if (isPlainObject(args?._min) || isPlainObject(args?._max)) {
    const minimums: DemoRow = {};
    const maximums: DemoRow = {};
    for (const group of ['_min', '_max'] as const) {
      const requested = args?.[group];
      if (!isPlainObject(requested)) continue;
      for (const field of Object.keys(requested)) {
        const values = rows
          .map((row) => toComparable(row[field]))
          .filter((value) => value !== null && value !== undefined);
        if (!values.length) continue;
        if (group === '_min') {
          minimums[field] = values.reduce((best, value) =>
            compareValues(value, best) < 0 ? value : best
          );
        } else {
          maximums[field] = values.reduce((best, value) =>
            compareValues(value, best) > 0 ? value : best
          );
        }
      }
    }
    if (Object.keys(minimums).length) result._min = minimums;
    if (Object.keys(maximums).length) result._max = maximums;
  }

  if (isPlainObject(args?._count)) {
    const counts: DemoRow = {};
    for (const field of Object.keys(args._count)) {
      counts[field] =
        field === '_all'
          ? rows.length
          : rows.filter((row) => row[field] !== null && row[field] !== undefined).length;
    }
    result._count = counts;
  }

  return result;
}

function groupBy(model: string, args: QueryArgs = {}): DemoRow[] {
  const by = Array.isArray(args?.by) ? (args.by as string[]) : [];
  const rows = getRows(model).filter((row) => matchesWhere(row, args?.where));
  const groups = new Map<string, DemoRow[]>();

  for (const row of rows) {
    const key = JSON.stringify(by.map((field) => row[field] ?? null));
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const output: DemoRow = {};
    for (const field of by) output[field] = group[0][field] ?? null;

    if (isPlainObject(args?._count)) {
      const counts: DemoRow = {};
      for (const field of Object.keys(args._count)) {
        counts[field] =
          field === '_all'
            ? group.length
            : group.filter((row) => row[field] !== null && row[field] !== undefined).length;
      }
      output._count = counts;
    }

    return output;
  });
}

const MODELS = [
  'user',
  'admin',
  'student',
  'teacher',
  'announcement',
  'attendance',
  'mark',
  'payment',
  'schoolEvent',
  'schoolRule',
  'schoolSchedule',
  'loginActivity',
  'homework',
  'homeworkSubmission',
  'lessonPlan',
] as const;

const WRITABLE_MODELS = new Set(['mark', 'attendance', 'homework', 'homeworkSubmission', 'lessonPlan']);

function nextId(model: string): number {
  const ids = getRows(model).map((row) => Number(row.id ?? 0));
  return (Math.max(0, ...ids) + 1) as number;
}

function createRow(model: string, data: DemoRow): DemoRow {
  const row: DemoRow = { ...data, id: nextId(model) };
  getRows(model).push(row);
  return row;
}

function modelHandlers(model: string): DemoRow {
  const writable = WRITABLE_MODELS.has(model);

  return {
    findMany: (args: QueryArgs = {}) => Promise.resolve(runQuery(model, args)),
    findFirst: (args: QueryArgs = {}) => Promise.resolve(runQuery(model, args)[0] ?? null),
    findUnique: (args: QueryArgs = {}) => Promise.resolve(runQuery(model, args)[0] ?? null),
    findFirstOrThrow: async (args: QueryArgs = {}) => {
      const row = runQuery(model, args)[0];
      if (!row) throw new Error(`No ${model} found`);
      return row;
    },
    findUniqueOrThrow: async (args: QueryArgs = {}) => {
      const row = runQuery(model, args)[0];
      if (!row) throw new Error(`No ${model} found`);
      return row;
    },
    count: (args: QueryArgs = {}) =>
      Promise.resolve(getRows(model).filter((row) => matchesWhere(row, args?.where)).length),
    aggregate: (args: QueryArgs = {}) => Promise.resolve(aggregate(model, args)),
    groupBy: (args: QueryArgs = {}) => Promise.resolve(groupBy(model, args)),
    create: writable
      ? (args: QueryArgs = {}) => {
          const row = createRow(model, { ...((args?.data as DemoRow) ?? {}) });
          return Promise.resolve(projectRow(row, model, args?.select ? { select: args.select } : {}));
        }
      : () => refused('create', model),
    createMany: writable
      ? (args: QueryArgs = {}) => {
          const data = Array.isArray(args?.data) ? (args.data as DemoRow[]) : [];
          const rows = data.map((item) => createRow(model, item));
          return Promise.resolve({ count: rows.length });
        }
      : () => refused('createMany', model),
    createManyAndReturn: writable
      ? (args: QueryArgs = {}) => {
          const data = Array.isArray(args?.data) ? (args.data as DemoRow[]) : [];
          const rows = data.map((item) => createRow(model, item));
          return Promise.resolve(rows.map((row) => projectRow(row, model, { select: args?.select })));
        }
      : () => refused('createManyAndReturn', model),
    update: () => refused('update', model),
    updateMany: () => refused('updateMany', model),
    updateManyAndReturn: () => refused('updateManyAndReturn', model),
    upsert: () => refused('upsert', model),
    delete: () => refused('delete', model),
    deleteMany: () => refused('deleteMany', model),
  };
}

const demoClient: DemoRow = {};

for (const model of MODELS) {
  demoClient[model] = modelHandlers(model);
}

Object.assign(demoClient, {
  $queryRaw: (sql: unknown, ...values: unknown[]) => Promise.resolve(rawQuery(sql, values)),
  $queryRawUnsafe: (sql: unknown, ...values: unknown[]) =>
    Promise.resolve(rawQuery(String(sql), values)),
  $executeRaw: () => refused('$executeRaw'),
  $executeRawUnsafe: () => refused('$executeRawUnsafe'),
  $runCommandRaw: () => refused('$runCommandRaw'),
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $on: () => undefined,
  $use: () => undefined,
  $extends: () => demoClient,
  $transaction: async (input: unknown) => {
    if (Array.isArray(input)) return Promise.all(input);
    if (typeof input === 'function') {
      return (input as (client: DemoRow) => unknown)(demoClient);
    }
    return input;
  },
});

/**
 * Cast at the boundary only. `db.ts` re-casts this to the live Prisma client
 * type so existing callers stay unchanged; in demo mode every operation is
 * served from memory and writes are refused.
 */
export const demoDb = demoClient as any;
