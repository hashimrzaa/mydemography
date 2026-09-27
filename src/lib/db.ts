import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL || "file:./data/expenses.db";

/**
 * Local pe ye seedha SQLite file kholta hai (data/expenses.db).
 * Vercel pe DATABASE_URL ko libsql://... kar do — same SQL, same code,
 * kyunki Vercel ka filesystem ephemeral hai aur .db file wahan survive nahi karti.
 */
function makeClient(): Client {
  if (DATABASE_URL.startsWith("file:")) {
    const filePath = DATABASE_URL.slice("file:".length);
    const dir = path.dirname(path.resolve(process.cwd(), filePath));
    fs.mkdirSync(dir, { recursive: true });
  }
  return createClient({
    url: DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
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
