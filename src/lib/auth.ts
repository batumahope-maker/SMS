import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { verifyStoredPassword } from '@/lib/password';
import { fetchUserRegistrationFlags } from '@/lib/user-flags';

/**
 * Roles that exist in the live `users.role` enum
 * (admin, teacher, student). There is no `parent` role in the live schema.
 */
export const LIVE_ROLES = ['admin', 'teacher', 'student'] as const;
export type LiveRole = (typeof LIVE_ROLES)[number];

export function isLiveRole(value: unknown): value is LiveRole {
  return typeof value === 'string' && (LIVE_ROLES as readonly string[]).includes(value);
}

/**
 * `users.status` is a nullable MySQL enum with values
 * Active / Inactive / Suspended / Graduated.
 *
 * Rows created outside the PHP forms may have NULL. PHP's own checks are
 * inconsistent (login.php does not check status at all; student-login.php
 * requires exactly 'Active'). This build treats NULL as active, matching the
 * column default, and requires an explicit 'Active' for every other value.
 */
export function isActiveStatus(status: unknown): boolean {
  if (status === null || status === undefined) return true;
  return String(status).trim().toLowerCase() === 'active';
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;

        if (!username || !password) return null;

        // Live `users` columns: id, username, password, full_name, email,
        // phone, role, status, created_at. There is no school_id column and
        // no parent relation.
        const select = {
          id: true,
          username: true,
          email: true,
          password: true,
          fullName: true,
          role: true,
          status: true,
        } as const;

        // Parity with the PHP entry points: login.php looks students and
        // teachers up by email, while admin-login.php uses username. Accept
        // either identifier so existing accounts can sign in.
        let user = await db.user.findUnique({ where: { username }, select });

        if (!user) {
          user = await db.user.findFirst({ where: { email: username }, select });
        }

        if (!user) return null;
        if (!isActiveStatus(user.status)) return null;

        const passwordMatch = await verifyStoredPassword(password, user.password);
        if (!passwordMatch) return null;

        const role = String(user.role).toLowerCase();
        if (!isLiveRole(role)) return null;

        // The forced-change flag lives in the ADDITIVE must_change_password
        // column (approved but not yet applied to the live schema); the
        // guarded read answers the safe default (false) until it exists.
        let mustChangePassword = false;
        try {
          const flags = await fetchUserRegistrationFlags(Number(user.id));
          mustChangePassword = flags?.mustChangePassword ?? false;
        } catch {
          mustChangePassword = false;
        }

        return {
          id: String(user.id),
          name: user.fullName || user.username,
          email: user.email,
          role,
          username: user.username,
          mustChangePassword,
          // The live database is single-school and has no school_id column.
          // Kept as an empty string so existing type contracts stay stable.
          schoolId: '',
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.username = user.username;
        token.mustChangePassword = user.mustChangePassword === true;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? '');
        session.user.role = String(token.role ?? '');
        session.user.schoolId = String(token.schoolId ?? '');
        session.user.username = String(token.username ?? '');
        session.user.mustChangePassword = token.mustChangePassword === true;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};
