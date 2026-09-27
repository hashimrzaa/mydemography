export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "PKR";
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE || "en-PK";

const formatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function money(amount: number): string {
  return formatter.format(amount);
}

/** Server-side push messages me — locale/currency same rakhne ke liye. */
export function moneyPlain(amount: number): string {
  return `${CURRENCY} ${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(amount)}`;
}
