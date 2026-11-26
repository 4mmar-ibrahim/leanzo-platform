import { forwardBookingRequest } from '@/lib/api/forwardBookingRequest';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return forwardBookingRequest(request, 'availability');
}
