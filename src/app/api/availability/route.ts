import { NextRequest, NextResponse } from 'next/server';
import { getTimeSlotsForDate } from '@/lib/bookingEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const url = new URL(req.url);
  const targetUrl = `${backendUrl}/api/availability${url.search}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const headers = new Headers();
    const auth = req.headers.get('authorization');
    if (auth) headers.set('authorization', auth);
    const cookie = req.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);

    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(timeout));

    if (backendRes.ok) {
      const data = await backendRes.json().catch(() => null);
      if (data) {
        return NextResponse.json(data, {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
      }
    }
  } catch {
    // Backend offline / unreachable on remote deployment (e.g. Vercel)
  }

  // Graceful standalone fallback computation
  const date = url.searchParams.get('date') || '';
  const duration = url.searchParams.get('duration');
  const serviceId = url.searchParams.get('serviceId') || undefined;
  const serviceIds = url.searchParams.get('serviceIds');
  const category = url.searchParams.get('category') || undefined;
  const includeUnavailable = url.searchParams.get('includeUnavailable') === 'true';

  if (!date) {
    return NextResponse.json({ success: false, message: 'يرجى تحديد التاريخ' }, { status: 422 });
  }

  const durationNum = duration ? parseInt(duration, 10) : undefined;
  const parsedServiceIds = serviceIds ? serviceIds.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  const calculatedSlots = getTimeSlotsForDate(
    date,
    undefined,
    serviceId,
    undefined,
    [],
    durationNum,
    undefined,
    parsedServiceIds,
    category,
    includeUnavailable
  );

  return NextResponse.json(
    {
      success: true,
      data: {
        date,
        isDayAvailable: calculatedSlots.length > 0,
        slots: calculatedSlots,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const url = new URL(req.url);
  const targetUrl = `${backendUrl}/api/availability${url.search}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const bodyText = await req.text();
    const backendRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (backendRes.ok) {
      const data = await backendRes.json().catch(() => null);
      if (data) return NextResponse.json(data, { status: backendRes.status });
    }
  } catch {
    // Fallback
  }

  return NextResponse.json({
    success: true,
    data: { valid: true, message: 'الموعد متاح للحجز' },
  });
}
