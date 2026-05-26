import { AuthError } from './auth';
import { NextResponse } from 'next/server';

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.code }, { status: err.status });
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  console.error('[api]', err);
  return NextResponse.json({ error: msg }, { status: 500 });
}

export function notFound(): NextResponse {
  return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
}
