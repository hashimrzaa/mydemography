import Dashboard from "@/components/Dashboard";
import { getMonth } from "@/lib/expenses";
import { currentMonth, isValidMonth, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; add?: string }>;
}) {
  const params = await searchParams;
  const month = params.month && isValidMonth(params.month) ? params.month : currentMonth();
  const summary = await getMonth(month);

  return (
    <main className="shell">
      <Dashboard
        initial={summary}
        month={month}
        today={today()}
        thisMonth={currentMonth()}
        openAdd={params.add === "1"}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""}
      />
    </main>
  );
}
