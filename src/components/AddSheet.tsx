"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  defaultDate: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function AddSheet({ defaultDate, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Price zero se zyada hona chahiye.");
    if (!reason.trim()) return setError("Reason likhna zaroori hai.");

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, reason: reason.trim(), spent_on: date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save nahi hua, dobara koshish karo.");
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuch galat ho gaya.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="sheet" onSubmit={submit}>
        <h2>Naya kharcha</h2>

        <div className="field">
          <label htmlFor="amount">Price</label>
          <input
            id="amount"
            ref={amountRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="reason">Reason</label>
          <input
            id="reason"
            type="text"
            maxLength={200}
            placeholder="Petrol, chai, grocery..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
