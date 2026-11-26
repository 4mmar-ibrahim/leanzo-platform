import { forwardBookingRequest } from '@/lib/api/forwardBookingRequest';

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardBookingRequest(request, `subscriptions/${path.map(encodeURIComponent).join('/')}`);
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
