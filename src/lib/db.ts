import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

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
/** Local .db file chal rahi hai ya remote libSQL/Turso — pragmas sirf file ke liye lagte hain. */
function usingLocalFile(): boolean {
  return (process.env.DATABASE_URL || "file:./data/expenses.db").startsWith("file:");
}

function makeClient(): Client {
  let url = process.env.DATABASE_URL || "file:./data/expenses.db";

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

/**
 * Client pehli asli query pe banta hai, module load pe nahi.
 * Ye zaroori hai: `next build` page data collect karte waqt ye module import karta hai,
 * aur us waqt na DATABASE_URL production wala hota hai na filesystem likhne layak —
 * module-level connection build ko hi fail kar deta tha.
 */
function client(): Client {
  globalForDb.__kharchaClient ??= makeClient();
  return globalForDb.__kharchaClient;
}

/**
 * Local SQLite file ke liye durability pragmas.
 *
 * Default WAL mode me commit hua data `-wal` file me rehta hai jab tak checkpoint na ho.
 * Agar process force-kill ho jaaye ya wal file gum ho jaaye to wo entries chali jaati hain
 * (testing me exactly yahi hua — 4 entries gayab, sqlite_sequence 6 pe rah gaya).
 * Is app me likhaai bahut kam hai, isliye rollback journal + synchronous FULL behtar hai:
 * har commit seedha main .db file me, aur koi alag wal file rakhni hi nahi padti.
 */
async function harden(c: Client): Promise<void> {
  await c.execute("PRAGMA journal_mode = DELETE");
  await c.execute("PRAGMA synchronous = FULL");
}

async function migrate(c: Client): Promise<void> {
  if (usingLocalFile()) await harden(c);

  await c.batch(
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

export function db(): Client {
  return client();
}

/** Har query se pehle ise call karo — migration sirf ek baar chalti hai. */
export async function ready(): Promise<Client> {
  const c = client();
  if (!globalForDb.__kharchaInit) {
    // Fail hone pe promise cache mat karo, warna ek temporary error hamesha ke liye chipak jaata hai.
    globalForDb.__kharchaInit = migrate(c).catch((error) => {
      globalForDb.__kharchaInit = undefined;
      throw error;
    });
  }
  await globalForDb.__kharchaInit;
  return c;
}
