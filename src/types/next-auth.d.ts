import type { DefaultSession } from 'next-auth';
import type { DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      schoolId: string;
      username: string;
      /** True when the account holds a temporary password and must visit /change-password. */
      mustChangePassword: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
    schoolId: string;
    username: string;
    mustChangePassword?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    schoolId?: string;
    username?: string;
    mustChangePassword?: boolean;
  }
}
