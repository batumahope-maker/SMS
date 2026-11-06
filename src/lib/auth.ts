import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

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

        // Use the Prisma model that belongs to this application.
        // The previous raw SQL queried `public.users` with legacy column
        // names and returned an empty schoolId, which did not match the
        // current Prisma schema or the application's school-scoped queries.
        const user = await db.user.findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
            role: true,
            status: true,
            schoolId: true,
            student: { select: { fullName: true } },
            teacher: { select: { fullName: true } },
            parent: { select: { fullName: true } },
          },
        });

        if (!user || user.status.trim().toLowerCase() !== 'active') {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.student?.fullName ?? user.teacher?.fullName ?? user.parent?.fullName ?? user.username,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          username: user.username,
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
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? '');
        session.user.role = String(token.role ?? '');
        session.user.schoolId = String(token.schoolId ?? '');
        session.user.username = String(token.username ?? '');
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
