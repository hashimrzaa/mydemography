import { NextResponse } from "next/server";
import { deleteExpense } from "@/lib/expenses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const deleted = await deleteExpense(numericId);
  if (!deleted) return NextResponse.json({ error: "Entry nahi mili" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
