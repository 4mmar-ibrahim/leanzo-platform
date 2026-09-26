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
