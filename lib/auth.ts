import NextAuth, { type DefaultSession } from 'next-auth';
import authConfig from './auth.config';
import { db } from './db/client';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export type Role = 'admin' | 'user' | 'viewer';

declare module 'next-auth' {
  interface Session {
    user: {
      role: Role;
    } & DefaultSession['user'];
  }
}

const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const existing = await db.select().from(users).where(eq(users.email, email));

      if (existing.length === 0) {
        if (!adminEmails.includes(email)) return false;
        await db.insert(users).values({
          email,
          name: user.name ?? null,
          role: 'admin',
        });
        return true;
      }

      const u = existing[0];
      if (!u.isActive) return false;

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const u = await db.select().from(users).where(eq(users.email, user.email.toLowerCase()));
        if (u[0]) {
          (token as Record<string, unknown>).userId = u[0].id;
          (token as Record<string, unknown>).role = u[0].role as Role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as Record<string, unknown>;
      if (typeof t.userId === 'number') session.user.id = String(t.userId);
      if (typeof t.role === 'string') session.user.role = t.role as Role;
      return session;
    },
  },
});

export class AuthError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN',
    public status: number,
  ) {
    super(code);
  }
}

export async function requireRole(
  allowed: Role[],
): Promise<{ id: number; role: Role; email: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError('UNAUTHORIZED', 401);
  if (!allowed.includes(session.user.role)) throw new AuthError('FORBIDDEN', 403);
  return {
    id: Number(session.user.id),
    role: session.user.role,
    email: session.user.email ?? '',
  };
}
