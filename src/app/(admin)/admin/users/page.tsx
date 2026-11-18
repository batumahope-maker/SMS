import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { detectStoredPasswordFormat } from '@/lib/password';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PendingRegistrationsCard } from '@/components/admin/PendingRegistrationsCard';
import { AccountActions } from '@/components/admin/AccountActions';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

const ROLES = ['all', 'admin', 'teacher', 'student'] as const;
const STATUSES = ['all', 'Active', 'Inactive', 'Suspended', 'Graduated'] as const;

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    case 'Suspended':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
    case 'Graduated':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'Inactive':
      return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700';
    default:
      return '';
  }
}

function passwordFormatBadge(format: 'md5' | 'bcrypt' | 'unknown') {
  if (format === 'bcrypt') {
    return (
      <Badge variant="outline" className="text-xs">
        bcrypt
      </Badge>
    );
  }
  if (format === 'md5') {
    return (
      <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800">
        MD5 (legacy)
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-red-700 border-red-200 dark:text-red-300 dark:border-red-800">
      unknown
    </Badge>
  );
}

const READONLY_TITLE =
  'Unavailable: no approved database procedure covers arbitrary account status changes. ' +
  'Only the approval and password-reset flows write to the database, through the restricted writer account.';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    role?: string | string[];
    status?: string | string[];
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const params = await searchParams;
  const pick = (value?: string | string[]) =>
    (Array.isArray(value) ? value[0] : value) ?? '';

  const q = pick(params.q).trim().slice(0, 100);
  const role = ROLES.includes(pick(params.role) as (typeof ROLES)[number])
    ? (pick(params.role) as (typeof ROLES)[number])
    : 'all';
  const status = STATUSES.includes(
    pick(params.status) as (typeof STATUSES)[number]
  )
    ? (pick(params.status) as (typeof STATUSES)[number])
    : 'all';
  const rawPage = pick(params.page);
  const requestedPage = Number.parseInt(rawPage || '1', 10);

  const where = {
    ...(role === 'all' ? {} : { role }),
    ...(status === 'all' ? {} : { status: status as 'Active' | 'Inactive' | 'Suspended' | 'Graduated' }),
    ...(q
      ? {
          OR: [
            { username: { contains: q } },
            { email: { contains: q } },
            { fullName: { contains: q } },
          ],
        }
      : {}),
  };

  const total = await db.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const accounts = await db.user.findMany({
    where,
    orderBy: { id: 'asc' },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        // Used ONLY server-side for format detection; never rendered or sent
        // to the client.
        password: true,
        student: { select: { studentId: true } },
        teacher: { select: { teacherId: true } },
        admin: { select: { adminLevel: true } },
      },
  });

  // Most recent login per user from the denormalised login_activity audit
  // table. The live table holds few rows, so one bounded query beats N.
  const recentActivity = await db.loginActivity.findMany({
    orderBy: { loggedInAt: 'desc' },
    take: 500,
    select: { userId: true, loggedInAt: true },
  });
  const lastLoginByUserId = new Map<number, Date>();
  for (const row of recentActivity) {
    if (row.userId != null && !lastLoginByUserId.has(row.userId)) {
      lastLoginByUserId.set(row.userId, row.loggedInAt);
    }
  }

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (role !== 'all') search.set('role', role);
    if (status !== 'all') search.set('status', status);
    if (nextPage > 1) search.set('page', String(nextPage));
    const query = search.toString();
    return query ? `/admin/users?${query}` : '/admin/users';
  };

  const filterHref = (key: 'role' | 'status', value: string) => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (key === 'role' && value !== 'all') search.set('role', value);
    if (key === 'status' && value !== 'all') search.set('status', value);
    const query = search.toString();
    return query ? `/admin/users?${query}` : '/admin/users';
  };

  const firstRow = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastRow = (currentPage - 1) * PAGE_SIZE + accounts.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Management</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>users</code> table and recent
          logins. Showing {firstRow}–{lastRow} of {total} accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available write actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Two write flows are enabled through a restricted writer account
            (USAGE + EXECUTE on six stored procedures only — no table
            privileges): approving/rejecting pending registrations, and issuing
            temporary passwords for student/teacher accounts.
          </p>
          <p>
            Activating/deactivating arbitrary accounts stays disabled: no
            approved procedure covers arbitrary status changes, so those
            buttons are disabled — they are never faked. Registration, login
            and password changes route the user through
            <code className="mx-1">/change-password</code>
            when a temporary password is set.
          </p>
          <p>
            Stored passwords are shown only as a format badge
            (bcrypt / MD5-legacy). The hashes themselves are never displayed.
          </p>
        </CardContent>
      </Card>

      <PendingRegistrationsCard />

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/admin/users" className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search username, email or name"
              className="h-9 w-64 rounded-md border bg-transparent px-3 text-sm"
            />
            <select
              name="role"
              defaultValue={role}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'All roles' : r}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              Filter
            </Button>
            {(q || role !== 'all' || status !== 'all') && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users">Clear</Link>
              </Button>
            )}
          </form>

          <div className="flex flex-wrap gap-2 text-xs">
            {ROLES.map((r) => (
              <Link
                key={r}
                href={filterHref('role', r)}
                className={
                  r === role
                    ? 'rounded-full border px-2.5 py-1 font-medium bg-primary text-primary-foreground'
                    : 'rounded-full border px-2.5 py-1 text-muted-foreground hover:bg-muted'
                }
              >
                {r === 'all' ? 'All roles' : r}
              </Link>
            ))}
            <span className="mx-1 text-muted-foreground">·</span>
            {STATUSES.map((s) => (
              <Link
                key={s}
                href={filterHref('status', s)}
                className={
                  s === status
                    ? 'rounded-full border px-2.5 py-1 font-medium bg-primary text-primary-foreground'
                    : 'rounded-full border px-2.5 py-1 text-muted-foreground hover:bg-muted'
                }
              >
                {s === 'all' ? 'All statuses' : s}
              </Link>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-xs">
                      {account.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {account.username}
                      {session.user.id === String(account.id) && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{account.fullName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          account.role === 'admin'
                            ? 'text-xs text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-800'
                            : 'text-xs'
                        }
                      >
                        {account.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {account.student?.studentId ??
                        account.teacher?.teacherId ??
                        (account.admin?.adminLevel
                          ? `Super Admin (${account.admin.adminLevel})`
                          : '—')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusBadgeClass(account.status)}`}>
                        {account.status ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {passwordFormatBadge(
                        detectStoredPasswordFormat(account.password)
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(account.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {lastLoginByUserId.has(account.id)
                        ? formatDate(lastLoginByUserId.get(account.id)!)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <AccountActions userId={account.id} role={account.role} />
                      </div>
                      <div className="mt-1 flex justify-end gap-1.5">
                        {account.status === 'Active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title={READONLY_TITLE}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title={READONLY_TITLE}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {accounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No accounts match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={buildHref(currentPage - 1)} rel="prev">
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              {currentPage < totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={buildHref(currentPage + 1)} rel="next">
                    Next
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
