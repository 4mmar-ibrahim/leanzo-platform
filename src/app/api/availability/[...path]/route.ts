import { forwardBookingRequest } from '@/lib/api/forwardBookingRequest';

export const dynamic = 'force-dynamic';

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardBookingRequest(request, `availability/${path.map(encodeURIComponent).join('/')}`);
}

export const GET = forward;
export const POST = forward;
