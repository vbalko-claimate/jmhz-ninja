import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Edge-safe config (no DB, no Node-only modules). Used by middleware.
// The full config (with DB callbacks) lives in lib/auth.ts and uses this as base.
export default {
  providers: [Google],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig;
