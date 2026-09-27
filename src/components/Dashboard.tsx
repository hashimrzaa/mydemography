"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AddSheet from "./AddSheet";
import NotificationCard from "./NotificationCard";
import type { MonthSummary } from "@/lib/expenses";
import { dayLabel, monthLabel, shiftMonth } from "@/lib/dates";
import { money } from "@/lib/money";

type Props = {
  initial: MonthSummary;
  month: string;
  today: string;
  thisMonth: string;
  openAdd: boolean;
  vapidPublicKey: string;
};

export default function Dashboard({ initial, month, today, thisMonth, openAdd, vapidPublicKey }: Props) {
  const [data, setData] = useState<MonthSummary>(initial);
  const [sheetOpen, setSheetOpen] = useState(openAdd);

  // Server se naya month aaya (month switch ke baad) to local state sync kar do.
  useEffect(() => setData(initial), [initial]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/expenses?month=${month}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [month]);

  const remove = useCallback(
    async (id: number) => {
      if (!confirm("Ye entry delete kar dein?")) return;
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) await refresh();
    },
    [refresh],
  );

  const todayTotal = data.days.find((d) => d.date === today)?.total ?? 0;
  const canGoForward = month < thisMonth;

  return (
    <>
      <header className="header">
        <h1 className="brand">
          Kharcha
          <span>Roz ka hisaab, mahine ka total</span>
        </h1>
      </header>

      <NotificationCard vapidPublicKey={vapidPublicKey} />

      <nav className="monthbar">
        <Link className="navbtn" href={`/?month=${shiftMonth(month, -1)}`} aria-label="Pichla mahina">
          ‹
        </Link>
        <strong>{monthLabel(month)}</strong>
        <Link
          className="navbtn"
          href={`/?month=${shiftMonth(month, 1)}`}
          aria-label="Agla mahina"
          aria-disabled={!canGoForward}
          tabIndex={canGoForward ? undefined : -1}
        >
          ›
        </Link>
      </nav>

      <section className="totals">
        <div className="total-card">
          <div className="label">{monthLabel(month)} ka total</div>
          <div className="value">{money(data.total)}</div>
        </div>

        <div className="substats">
          <div className="total-card">
            <div className="label">Aaj</div>
            <div className="value">{money(todayTotal)}</div>
          </div>
          <div className="total-card">
            <div className="label">Entries</div>
            <div className="value">{data.count}</div>
          </div>
          <div className="total-card">
            <div className="label">Daily avg</div>
            <div className="value">{money(data.dailyAverage)}</div>
          </div>
        </div>
      </section>

      {data.days.length === 0 ? (
        <p className="empty">
          Is mahine ka koi kharcha abhi record nahi hua.
          <br />
          Neeche <b>+ Add kharcha</b> dabao.
        </p>
      ) : (
        data.days.map((day) => (
          <section className="daygroup" key={day.date}>
            <div className="dayhead">
              <span>
                {dayLabel(day.date)}
                {day.date === today ? " · Aaj" : ""}
              </span>
              <span className="daytotal">{money(day.total)}</span>
            </div>
            <div className="list">
              {day.items.map((item) => (
                <div className="row" key={item.id}>
                  <span className="reason">{item.reason}</span>
                  <span className="amount">{money(item.amount)}</span>
                  <button
                    className="del"
                    onClick={() => remove(item.id)}
                    aria-label={`${item.reason} delete karo`}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <button className="fab" onClick={() => setSheetOpen(true)}>
        + Add kharcha
      </button>

      {sheetOpen && (
        <AddSheet
          defaultDate={month === thisMonth ? today : `${month}-01`}
          onClose={() => setSheetOpen(false)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
