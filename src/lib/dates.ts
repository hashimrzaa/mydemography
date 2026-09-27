export const APP_TZ = process.env.APP_TZ || "Asia/Karachi";

/** 'YYYY-MM-DD' for "abhi" in the app timezone. */
export function today(tz: string = APP_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 'YYYY-MM' for "abhi" in the app timezone. */
export function currentMonth(tz: string = APP_TZ): string {
  return today(tz).slice(0, 7);
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Inclusive 'YYYY-MM-DD' bounds of a month — used for BETWEEN queries. */
export function monthRange(month: string): { start: string; end: string } {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string, locale = "en-US"): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, m - 1, 1)),
  );
}

/** "Mon, 27 Sep" — din ka heading. */
export function dayLabel(date: string, locale = "en-US"): string {
  const [year, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m - 1, d)));
}
