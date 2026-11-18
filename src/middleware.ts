import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';

/**
 * Server-side role enforcement.
 *
 * The live database only defines the roles admin, teacher and student.
 * Every role-prefixed route is gated here so that hiding a link is never the
 * only protection.
 */

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

const PREFIX_ROLE: Record<string, string> = {
  '/admin': 'admin',
  '/teacher': 'teacher',
  '/student': 'student',
};

/** Prefixes that exist in the UI but have no backing role in the live schema. */
const UNSUPPORTED_PREFIXES = ['/parent'];

function matchPrefix(pathname: string, prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return prefix;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let token: JWT | null = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    // A missing/invalid secret must fail closed, not open.
    token = null;
  }
  const role =
    token && typeof token.role === 'string' ? token.role : null;
  const mustChangePassword = token?.mustChangePassword === true;

  // Already signed in: keep users away from the login screen.
  if (pathname === '/login') {
    if (role && ROLE_HOME[role]) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    return NextResponse.next();
  }

  // The forced-change page itself: any signed-in role may visit it.
  if (pathname === '/change-password') {
    if (!role) {
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // A temporary password issued by an administrator must be changed before
  // the account can use any other page.
  if (mustChangePassword) {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }

  // Portals with no role in the live schema are closed rather than shown empty.
  if (matchPrefix(pathname, UNSUPPORTED_PREFIXES)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'RoleNotSupported');
    return NextResponse.redirect(url);
  }

  const prefix = matchPrefix(pathname, Object.keys(PREFIX_ROLE));
  if (!prefix) return NextResponse.next();

  const requiredRole = PREFIX_ROLE[prefix];

  if (!role) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (role !== requiredRole) {
    const home = ROLE_HOME[role];
    if (home) return NextResponse.redirect(new URL(home, request.url));
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'Forbidden');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/change-password',
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/parent/:path*',
  ],
};
