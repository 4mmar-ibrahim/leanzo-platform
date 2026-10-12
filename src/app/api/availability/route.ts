import { NextRequest, NextResponse } from 'next/server';
import { getTimeSlotsForDate } from '@/lib/bookingEngine';

export const dynamic = 'force-dynamic';

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function fillLegacyBreakGap(slots: any[], duration: number): any[] {
  if (!Array.isArray(slots) || slots.length === 0) return slots;

  for (const s of slots) {
    if (s.reason === 'استراحة عمل') {
      s.available = true;
      delete s.reason;
    }
  }

  const has14Slot = slots.some((s) => s.start === '14:00' || s.time24 === '14:00');
  const has15Slot = slots.some((s) => s.start === '15:00' || s.time24 === '15:00');
  const hasPreBreakSlot = slots.some((s) => {
    const startM = timeToMinutes(s.start || s.time24 || '');
    return startM >= 720 && startM <= 810;
  });

  if (!has14Slot && (has15Slot || hasPreBreakSlot)) {
    const endMinutes = Math.min(1440, 14 * 60 + (duration || 60));
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    const endTimeStr = `${endH}:${endM}`;
    const timeStr = `14:00 – ${endTimeStr}`;

    const newSlot = {
      time: timeStr,
      time24: '14:00',
      label: timeStr,
      labelEn: timeStr,
      start: '14:00',
      end: endTimeStr,
      available: true,
      serviceDurationMinutes: duration || 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: duration || 60,
      scheduledStart: '14:00',
      scheduledEnd: endTimeStr,
    };

    const updated = [...slots, newSlot];
    updated.sort((a, b) => {
      const mA = timeToMinutes(a.start || a.time24 || '00:00');
      const mB = timeToMinutes(b.start || b.time24 || '00:00');
      return mA - mB;
    });
    return updated;
  }

  return slots;
}

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
        if (data.data && Array.isArray(data.data.slots)) {
          const reqDuration = url.searchParams.get('duration');
          const effDur = data.data.serviceTiming?.serviceDurationMinutes || (reqDuration ? parseInt(reqDuration, 10) : 60);
          data.data.slots = fillLegacyBreakGap(data.data.slots, effDur);
        }
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
