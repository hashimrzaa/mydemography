import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { pushConfigured, removeSubscription, saveSubscription } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Server pe VAPID keys set nahi hain" }, { status: 503 });
  }

  const sub = (await request.json().catch(() => null)) as PushSubscription | null;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Subscription adhoori hai" }, { status: 400 });
  }

  await saveSubscription(sub);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "endpoint chahiye" }, { status: 400 });

  await removeSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
