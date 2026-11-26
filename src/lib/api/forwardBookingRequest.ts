import { NextResponse } from 'next/server';

export async function forwardBookingRequest(request: Request, path: string) {
  const backend = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  const headers = new Headers();
  for (const name of ['authorization', 'cookie', 'content-type', 'idempotency-key', 'x-idempotency-key', 'x-admin-token', 'x-customer-token', 'x-booking-access', 'origin']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(`${backend}/api/${path}${new URL(request.url).search}`, {
      method: request.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? await request.text() : undefined,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
      cache: 'no-store',
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({
      success: false,
      code: 'BOOKING_SERVICE_UNAVAILABLE',
      message: 'تعذر الاتصال بخدمة الحجوزات. حاول مرة أخرى.',
    }, { status: 503 });
  }
}
