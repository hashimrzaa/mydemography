"use client";

import { useCallback, useEffect, useState } from "react";

type State = "loading" | "unsupported" | "off" | "on" | "blocked";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export default function NotificationCard({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      Boolean(vapidPublicKey);

    // Pehle sirf browser se pooch kar card dikha do — service worker registration
    // ka intezaar nahi karte, warna slow/atki hui registration pe card kabhi nahi aata.
    if (!supported) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission === "denied" ? "blocked" : "off");

    // Phir background me register karke "on" state confirm kar lo.
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled && sub && Notification.permission === "granted") setState("on");
      } catch (error) {
        console.error("service worker register fail", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  const enable = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      // register() idempotent hai — agar effect wali registration fail hui thi to yahan retry ho jaati hai.
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        }));

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Subscribe fail");

      setState("on");
      setNote("Ho gaya — roz reminder aayega.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Notification on nahi ho saka.");
    } finally {
      setBusy(false);
    }
  }, [vapidPublicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setNote(res.ok ? `Test bheja gaya (${body.sent} device).` : body.error || "Test fail.");
    setBusy(false);
  }, []);

  if (state === "loading") return null;

  return (
    <div className="notify">
      <div className="text">
        {state === "on" && (
          <>
            <b>
              <span className="dot" />
              Daily reminder on hai
            </b>
            Roz shaam ko notification aayega ki aaj kitna kharch hua.
          </>
        )}
        {state === "off" && (
          <>
            <b>Daily reminder band hai</b>
            On karo — roz ek notification aayega aaj ke kharche ka.
          </>
        )}
        {state === "blocked" && (
          <>
            <b>Notifications browser me blocked hain</b>
            Address bar ke lock icon → Notifications → Allow karo, phir page refresh.
          </>
        )}
        {state === "unsupported" && (
          <>
            <b>Is browser me push support nahi</b>
            iPhone pe pehle &quot;Add to Home Screen&quot; karo, phir app se on karo.
          </>
        )}
        {note && <div style={{ marginTop: 6 }}>{note}</div>}
      </div>

      {state === "off" && (
        <button className="btn primary" onClick={enable} disabled={busy}>
          {busy ? "…" : "Allow notifications"}
        </button>
      )}
      {state === "on" && (
        <>
          <button className="btn" onClick={test} disabled={busy}>
            Test
          </button>
          <button className="btn" onClick={disable} disabled={busy}>
            Off
          </button>
        </>
      )}
    </div>
  );
}
