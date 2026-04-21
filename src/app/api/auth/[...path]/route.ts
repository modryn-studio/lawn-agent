import { auth } from '@/lib/auth/server';
import type { NextRequest } from 'next/server';

const { GET: _GET, POST: _POST, PUT: _PUT, DELETE: _DELETE, PATCH: _PATCH } = auth.handler();

// Neon Auth validates the Origin header against registered trusted origins.
// Rewrite Origin to the canonical app URL so Neon's auth server always sees
// the registered domain, regardless of whether the request came from www.,
// a Vercel preview URL, or any other variant.
function withCanonicalOrigin(request: NextRequest): Request {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!appUrl) return request;

  const headers = new Headers(request.headers);
  headers.set('origin', appUrl);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: 'half',
  } as RequestInit);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  return _GET(withCanonicalOrigin(request), { params: Promise.resolve(params) });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  return _POST(withCanonicalOrigin(request), { params: Promise.resolve(params) });
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  return _PUT(withCanonicalOrigin(request), { params: Promise.resolve(params) });
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  return _DELETE(withCanonicalOrigin(request), { params: Promise.resolve(params) });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  return _PATCH(withCanonicalOrigin(request), { params: Promise.resolve(params) });
}
