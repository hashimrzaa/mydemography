import { createClient } from "@libsql/client";
const c = createClient({ url: "file:C:/Users/rc/.kharcha/expenses.db" });
const r = await c.execute("SELECT id, amount, reason, spent_on, created_at FROM expenses ORDER BY id");
console.log("rows in file:", r.rows.length);
for (const x of r.rows) console.log(" ", x.id, x.amount, x.reason, x.spent_on, x.created_at);
console.log("seq:", JSON.stringify((await c.execute("SELECT * FROM sqlite_sequence")).rows));
