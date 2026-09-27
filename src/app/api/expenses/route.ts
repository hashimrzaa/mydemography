import { NextResponse } from "next/server";
import { addExpense, getMonth } from "@/lib/expenses";
import { currentMonth, isValidDate, isValidMonth, today } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") || currentMonth();
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "month ka format YYYY-MM hona chahiye" }, { status: 400 });
  }
  const summary = await getMonth(month);
  return NextResponse.json({ ...summary, today: today() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { amount, reason, spent_on } = (body ?? {}) as {
    amount?: unknown;
    reason?: unknown;
    spent_on?: unknown;
  };

  const value = typeof amount === "string" ? Number(amount) : amount;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "Price zero se zyada hona chahiye" }, { status: 400 });
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ error: "Reason likhna zaroori hai" }, { status: 400 });
  }
  if (reason.trim().length > 200) {
    return NextResponse.json({ error: "Reason 200 characters se chhota rakho" }, { status: 400 });
  }
  if (spent_on !== undefined && (typeof spent_on !== "string" || !isValidDate(spent_on))) {
    return NextResponse.json({ error: "Date ka format YYYY-MM-DD hona chahiye" }, { status: 400 });
  }

  const expense = await addExpense({
    amount: Math.round(value * 100) / 100,
    reason: reason.trim(),
    spent_on: spent_on as string | undefined,
  });

  return NextResponse.json(expense, { status: 201 });
}
