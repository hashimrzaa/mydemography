import webpush, { type PushSubscription } from "web-push";
import { ready } from "./db";

let configured = false;

/** VAPID keys env me hain ya nahi. Nahi hain to app chalta rahega, bas push off rahega. */
export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure(): void {
  if (configured) return;
  if (!pushConfigured()) throw new Error("VAPID keys missing — `npm run keys` chalao");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export async function saveSubscription(sub: PushSubscription): Promise<void> {
  const client = await ready();
  await client.execute({
    sql: `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
          VALUES (?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [sub.endpoint, sub.keys.p256dh, sub.keys.auth],
  });
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const client = await ready();
  await client.execute({ sql: `DELETE FROM push_subscriptions WHERE endpoint = ?`, args: [endpoint] });
}

export async function listSubscriptions(): Promise<PushSubscription[]> {
  const client = await ready();
  const result = await client.execute(`SELECT endpoint, p256dh, auth FROM push_subscriptions`);
  return result.rows.map((row) => {
    const r = row as unknown as Record<string, string>;
    return { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
  });
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/** Sab devices ko bhejta hai; jo subscription mar chuki hai (404/410) use DB se hata deta hai. */
export async function broadcast(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  configure();
  const subs = await listSubscriptions();
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await removeSubscription(sub.endpoint);
          removed++;
        } else {
          console.error("push failed", sub.endpoint, status, error);
        }
      }
    }),
  );

  return { sent, removed };
}
