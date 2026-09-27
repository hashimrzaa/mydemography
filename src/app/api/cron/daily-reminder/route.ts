import { NextResponse } from "next/server";
import { broadcast, pushConfigured } from "@/lib/push";
import { getDayTotal, getMonth } from "@/lib/expenses";
import { currentMonth, today } from "@/lib/dates";
import { moneyPlain } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Roz chalne wala reminder. Vercel Cron ise `Authorization: Bearer $CRON_SECRET`
 * ke saath hit karta hai (schedule vercel.json me hai).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!pushConfigured()) {
    return NextResponse.json({ error: "VAPID keys missing" }, { status: 503 });
  }

  const date = today();
  const [day, month] = await Promise.all([getDayTotal(date), getMonth(currentMonth())]);

  const body =
    day.count === 0
      ? `Aaj kuch add nahi kiya. Is mahine ab tak ${moneyPlain(month.total)}. Tap karke add karo.`
      : `Aaj ${moneyPlain(day.total)} kharch hue — ${day.count} ${day.count === 1 ? "entry" : "entries"}. Is mahine ${moneyPlain(month.total)}.`;

  const result = await broadcast({
    title: "Aaj ka kharcha 💸",
    body,
    url: "/?add=1",
    tag: `daily-reminder-${date}`,
  });

  return NextResponse.json({ ok: true, date, dayTotal: day.total, monthTotal: month.total, ...result });
}
