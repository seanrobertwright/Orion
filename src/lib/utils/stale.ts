export const STALE_THRESHOLD_DAYS = 14;

/**
 * Check if an application is stale
 * An application is considered stale if:
 * - Status is 'applied'
 * - More than STALE_THRESHOLD_DAYS have passed since last status change
 */
export function isApplicationStale(
  status: string,
  lastStatusChange: Date
): boolean {
  if (status !== 'applied') {
    return false;
  }

  const now = new Date();
  const daysSinceChange = Math.floor(
    (now.getTime() - lastStatusChange.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceChange > STALE_THRESHOLD_DAYS;
}
