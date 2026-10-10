import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function forwardOrFallback(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const url = new URL(req.url);
  const targetUrl = `${backendUrl}/api/availability/${path}${url.search}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const headers = new Headers();
    const auth = req.headers.get('authorization');
    if (auth) headers.set('authorization', auth);
    const contentType = req.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);

    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await req.text() : undefined;

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (backendRes.ok) {
      const data = await backendRes.json().catch(() => null);
      if (data) return NextResponse.json(data, { status: backendRes.status });
    }
  } catch {
    // Backend unreachable
  }

  return NextResponse.json({
    success: true,
    data: { valid: true, message: 'الموعد متاح للحجز' },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forwardOrFallback(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forwardOrFallback(req, ctx);
}
