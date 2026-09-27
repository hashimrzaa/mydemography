import { ready } from "./db";
import { monthRange, today } from "./dates";

export type Expense = {
  id: number;
  amount: number;
  reason: string;
  spent_on: string;
  created_at: string;
};

export type DayGroup = {
  date: string;
  total: number;
  items: Expense[];
};

export type MonthSummary = {
  month: string;
  total: number;
  count: number;
  days: DayGroup[];
  busiestDay: { date: string; total: number } | null;
  dailyAverage: number;
};

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: Number(row.id),
    amount: Number(row.amount),
    reason: String(row.reason),
    spent_on: String(row.spent_on),
    created_at: String(row.created_at),
  };
}

export async function addExpense(input: {
  amount: number;
  reason: string;
  spent_on?: string;
}): Promise<Expense> {
  const client = await ready();
  const spentOn = input.spent_on || today();
  const result = await client.execute({
    sql: `INSERT INTO expenses (amount, reason, spent_on)
          VALUES (?, ?, ?)
          RETURNING id, amount, reason, spent_on, created_at`,
    args: [input.amount, input.reason.trim(), spentOn],
  });
  return toExpense(result.rows[0] as unknown as Record<string, unknown>);
}

export async function deleteExpense(id: number): Promise<boolean> {
  const client = await ready();
  const result = await client.execute({ sql: `DELETE FROM expenses WHERE id = ?`, args: [id] });
  return result.rowsAffected > 0;
}

export async function getMonth(month: string): Promise<MonthSummary> {
  const client = await ready();
  const { start, end } = monthRange(month);
  const result = await client.execute({
    sql: `SELECT id, amount, reason, spent_on, created_at
          FROM expenses
          WHERE spent_on BETWEEN ? AND ?
          ORDER BY spent_on DESC, id DESC`,
    args: [start, end],
  });

  const rows = result.rows.map((r) => toExpense(r as unknown as Record<string, unknown>));
  const byDay = new Map<string, DayGroup>();
  let total = 0;

  for (const item of rows) {
    total += item.amount;
    const group = byDay.get(item.spent_on) ?? { date: item.spent_on, total: 0, items: [] };
    group.total += item.amount;
    group.items.push(item);
    byDay.set(item.spent_on, group);
  }

  const days = [...byDay.values()];
  const busiestDay = days.reduce<{ date: string; total: number } | null>(
    (best, d) => (best === null || d.total > best.total ? { date: d.date, total: d.total } : best),
    null,
  );

  return {
    month,
    total: round2(total),
    count: rows.length,
    days,
    busiestDay,
    dailyAverage: days.length ? round2(total / days.length) : 0,
  };
}

export async function getDayTotal(date: string): Promise<{ total: number; count: number }> {
  const client = await ready();
  const result = await client.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
          FROM expenses WHERE spent_on = ?`,
    args: [date],
  });
  const row = result.rows[0] as unknown as Record<string, unknown>;
  return { total: round2(Number(row.total)), count: Number(row.count) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
