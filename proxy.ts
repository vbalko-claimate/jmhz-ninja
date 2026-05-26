import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

// Statické soubory v /public/, které musí být přístupné bez přihlášení
// (jinak je Next.js Image optimizér nemůže interně fetchnout a vrátí 400).
const PUBLIC_FILE = /\.(?:jpg|jpeg|png|gif|svg|webp|ico|woff2?|ttf|otf|css|js|map|txt|xml)$/i;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_FILE.test(pathname);

  if (isPublic) return;

  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
