/**
 * The calendar day a moment falls on for the person, as "YYYY-MM-DD".
 *
 * Never compare this with `iso.slice(0, 10)`: that slice is the UTC day, and
 * for anyone east of Greenwich an evening record lands on the wrong bar.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
