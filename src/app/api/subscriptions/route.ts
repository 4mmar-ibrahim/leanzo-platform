import { forwardBookingRequest } from '@/lib/api/forwardBookingRequest';

export function POST(request: Request) {
  return forwardBookingRequest(request, 'subscriptions');
}
