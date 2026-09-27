import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL || "file:./data/expenses.db";

/**
 * "C:/x" ya "C:\x" Windows pe absolute hai, lekin Linux ka path.isAbsolute()
 * use relative samajhta hai aur cwd ke saath jod deta hai (/var/task/C:/...).
 * Isliye drive letter khud check karte hain.
 */
function isAbsolutePath(p: string): boolean {
  return path.isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p);
}

/**
 * Local pe ye seedha SQLite file kholta hai (data/expenses.db).
 * Vercel pe DATABASE_URL ko libsql://... kar do — same SQL, same code,
 * kyunki Vercel ka filesystem ephemeral hai aur .db file wahan survive nahi karti.
 */
function makeClient(): Client {
  let url = DATABASE_URL;

  if (url.startsWith("file:")) {
    if (process.env.VERCEL) {
      throw new Error(
        `DATABASE_URL abhi SQLite file pe set hai ("${url}"), aur Vercel pe ye kaam nahi karega — ` +
          `wahan ka filesystem ephemeral hai, data har request/deploy pe ud jaata hai. ` +
          `Vercel → Settings → Environment Variables me DATABASE_URL ko Turso URL (libsql://...) ` +
          `aur DATABASE_AUTH_TOKEN set karo, phir redeploy. Steps README.md me hain.`,
      );
    }

    // Relative path ko project root ke against absolute banate hain — Next ka server
    // process cwd hamesha project root nahi hota, aur libsql relative path cwd se
    // resolve karta hai. Absolute rakhne se dono jagah ek hi file khulti hai.
    const target = url.slice("file:".length);
    const abs = isAbsolutePath(target)
      ? target
      : path.join(path.resolve(/* turbopackIgnore: true */ process.cwd()), target);

    fs.mkdirSync(path.dirname(abs), { recursive: true });
    url = `file:${abs.replace(/\\/g, "/")}`;
  }

  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
}

// Dev me hot-reload har baar naya client na banaye.
const globalForDb = globalThis as unknown as {
  __kharchaClient?: Client;
  __kharchaInit?: Promise<void>;
};

const client: Client = globalForDb.__kharchaClient ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForDb.__kharchaClient = client;

async function migrate(): Promise<void> {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS expenses (
         id          INTEGER PRIMARY KEY AUTOINCREMENT,
         amount      REAL    NOT NULL CHECK (amount > 0),
         reason      TEXT    NOT NULL,
         spent_on    TEXT    NOT NULL,
         created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
       )`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_spent_on ON expenses (spent_on)`,
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
         endpoint    TEXT PRIMARY KEY,
         p256dh      TEXT NOT NULL,
         auth        TEXT NOT NULL,
         created_at  TEXT NOT NULL DEFAULT (datetime('now'))
       )`,
    ],
    "write",
  );
}

/** Har API route apne start me ise call karta hai; migration sirf ek baar chalti hai. */
export function db(): Client {
  return client;
}

export async function ready(): Promise<Client> {
  globalForDb.__kharchaInit ??= migrate();
  await globalForDb.__kharchaInit;
  return client;
}
