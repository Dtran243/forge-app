/**
 * dates.ts
 *
 * Date utilities that operate in LOCAL time rather than UTC.
 * Using toISOString() or toJSON() converts to UTC, which can produce
 * the wrong calendar date for users in UTC+ timezones.
 */

/** Returns today's date as a YYYY-MM-DD string in the device's local timezone. */
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns the Monday of the current week as a YYYY-MM-DD string in local time. */
export function currentWeekMondayISO(): string {
  const now = new Date();
  const dow = now.getDay(); // 0 = Sunday
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  return localDateISO(monday);
}
