import { NextResponse } from "next/server";
import { broadcast, pushConfigured } from "@/lib/push";
import { getDayTotal } from "@/lib/expenses";
import { today } from "@/lib/dates";
import { moneyPlain } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Test notification" button — daily reminder jaisa hi message bhejta hai, abhi. */
export async function POST() {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Server pe VAPID keys set nahi hain" }, { status: 503 });
  }

  const { total, count } = await getDayTotal(today());
  const result = await broadcast({
    title: "Aaj ka kharcha 💸",
    body:
      count === 0
        ? "Aaj abhi tak kuch add nahi kiya. Tap karke add karo."
        : `Aaj ${moneyPlain(total)} kharch hue (${count} ${count === 1 ? "entry" : "entries"}). Tap karke add karo.`,
    url: "/?add=1",
    tag: "daily-reminder-test",
  });

  return NextResponse.json({ ok: true, ...result });
}
