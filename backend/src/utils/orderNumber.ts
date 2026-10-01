/**
 * Generates a human-readable unique Cleanzo order number
 * Format: CLN-YYYY-XXXXXX (e.g. CLN-2026-000101)
 */
export function generateOrderNumber(sequenceNumber?: number): string {
  const year = new Date().getFullYear();
  if (sequenceNumber !== undefined) {
    const padded = sequenceNumber.toString().padStart(6, '0');
    return `CLN-${year}-${padded}`;
  }
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `CLN-${year}-${randomPart}`;
}

export function generateSubscriptionNumber(sequenceNumber?: number): string {
  const year = new Date().getFullYear();
  if (sequenceNumber !== undefined) {
    const padded = sequenceNumber.toString().padStart(6, '0');
    return `SUB-${year}-${padded}`;
  }
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `SUB-${year}-${randomPart}`;
}

export function generateVisitNumber(sequenceNumber?: number): string {
  const year = new Date().getFullYear();
  if (sequenceNumber !== undefined) {
    const padded = sequenceNumber.toString().padStart(6, '0');
    return `VIS-${year}-${padded}`;
  }
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `VIS-${year}-${randomPart}`;
}
