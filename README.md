# Kharcha — Daily Expense Tracker

Roz shaam ko phone/browser pe notification aata hai ki aaj kitne paise kharch hue.
Notification tap karo → **Add** form khulta hai → **price + reason** daalo.
Poori list mahine ke hisaab se banti hai, upar mahine ka **total** dikhta hai.

- **Database:** SQLite (libSQL client) — local pe plain `.db` file
- **Notifications:** Web Push (VAPID) + service worker, daily cron se trigger
- **Deploy:** Vercel (cron schedule `vercel.json` me)

---

## 1. Local pe chalao

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run keys                   # VAPID keys banti hain -> .env.local me paste karo
npm run icons                  # app icons generate (ek hi baar kaafi hai)
npm run dev
```

Kholo: http://localhost:3000

> **OneDrive / Dropbox warning (zaroori)**
> Ye project OneDrive folder ke andar hai. SQLite file ko OneDrive ke andar **mat** rakho —
> sync file ki purani copy wapas restore kar deta hai aur saari entries gayab ho jaati hain
> (testing me exactly yahi hua: 2 entries ek minute me 0 ho gayin).
> Isliye `.env.local` me DB path OneDrive se bahar set hai:
>
> ```
> DATABASE_URL=file:C:/Users/rc/.kharcha/expenses.db
> ```
>
> Backup lena ho to bas yahi ek file copy kar lo.

---

## 2. Notifications on karo

1. App kholo → upar **"Allow notifications"** button dabao → browser permission **Allow** karo.
2. **Test** button se abhi ek notification aa jaayega (check karne ke liye).
3. Roz ka reminder cron se aata hai (neeche dekho).

**Kaam karne ke liye zaroori:**

| Cheez | Kyun |
|---|---|
| HTTPS ya `localhost` | Web Push sirf secure origin pe chalta hai. Vercel pe HTTPS by default hai. |
| iPhone / iPad | Pehle Safari me **Share → Add to Home Screen**, phir us installed app se notifications on karo. Warna iOS push nahi deta. |
| Browser permission "Allow" | Agar galti se Block kar diya to address bar ke lock icon → Notifications → Allow, phir refresh. |
| Har device alag | Jis device pe on karoge sirf usi pe aayega. Laptop aur phone dono chahiye to dono pe on karo. |

Notification "Off" karne se us device ki subscription DB se delete ho jaati hai.

---

## 3. Vercel pe deploy

### a) Database (Turso) — ye pehle karo

Vercel ka filesystem **ephemeral** hai — wahan `.db` file save nahi rehti, har deploy pe data
ud jaata hai. Isliye production me wahi SQLite **Turso** pe chalti hai. Code bilkul same rehta
hai, sirf `DATABASE_URL` badalta hai.

> Build to `file:` URL ke saath bhi pass ho jaayega, par site khulte hi **500** aayega aur
> Vercel logs me saaf likha hoga ki `DATABASE_URL` Turso pe set karna hai. Ye jaan-boojh kar
> aisa hai — chupke se local file pe chalne se behtar hai saaf error dena.

```bash
npm i -g @tursodatabase/turso-cli     # ya: https://docs.turso.tech/quickstart
turso auth signup
turso db create kharcha
turso db show kharcha --url           # -> DATABASE_URL
turso db tokens create kharcha        # -> DATABASE_AUTH_TOKEN
```

Tables khud ban jaate hain — app pehli request pe migration chala leta hai.

### b) Deploy

```bash
npm i -g vercel
vercel                                # pehli baar: project link
vercel --prod
```

### c) Environment variables (Vercel dashboard → Settings → Environment Variables)

| Name | Value |
|---|---|
| `DATABASE_URL` | `libsql://kharcha-<you>.turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso token |
| `APP_TZ` | `Asia/Karachi` |
| `NEXT_PUBLIC_CURRENCY` | `PKR` |
| `NEXT_PUBLIC_LOCALE` | `en-PK` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npm run keys` wali public key |
| `VAPID_PRIVATE_KEY` | `npm run keys` wali private key |
| `VAPID_SUBJECT` | `mailto:aapka@email.com` |
| `CRON_SECRET` | koi lamba random string |

> Local aur production me **same VAPID keys** rakho. Keys badal do to purani subscriptions
> kaam karna band kar deti hain aur sabko dobara "Allow" karna padega.

### d) Daily notification ka time

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/daily-reminder", "schedule": "0 16 * * *" }] }
```

Vercel cron **UTC** me chalta hai. `0 16 * * *` = **9:00 PM Pakistan time** (UTC+5).

| Chahiye (PKT) | `schedule` |
|---|---|
| 8:00 PM | `0 15 * * *` |
| 9:00 PM | `0 16 * * *` |
| 10:00 PM | `0 17 * * *` |
| 11:00 PM | `0 18 * * *` |

Badal kar dobara deploy kar do. (Vercel ke free Hobby plan pe cron din me ek baar chalta hai —
ye setup usi ke hisaab se hai.)

---

## 4. Project structure

```
src/
  app/
    page.tsx                          dashboard (server-rendered)
    api/expenses/route.ts             GET month summary, POST naya kharcha
    api/expenses/[id]/route.ts        DELETE entry
    api/push/subscribe/route.ts       device subscribe / unsubscribe
    api/push/test/route.ts            "Test" button
    api/cron/daily-reminder/route.ts  roz ka reminder (cron isko hit karta hai)
  components/
    Dashboard.tsx                     totals, month switcher, day-wise list
    AddSheet.tsx                      price + reason + date form
    NotificationCard.tsx              permission + subscription UI
  lib/
    db.ts        SQLite connection + migrations
    expenses.ts  queries (add / delete / month summary)
    push.ts      web-push bhejna, dead subscriptions cleanup
    dates.ts     timezone-aware date helpers
    money.ts     currency formatting
public/
  sw.js                     service worker (push + notification click)
  manifest.webmanifest      PWA manifest
scripts/
  generate-vapid-keys.mjs   npm run keys
  generate-icons.mjs        npm run icons
```

### Database schema

```sql
expenses (id, amount, reason, spent_on 'YYYY-MM-DD', created_at)
push_subscriptions (endpoint, p256dh, auth, created_at)
```

---

## 5. Common masle

| Masla | Hal |
|---|---|
| Notification nahi aa raha | App me **Test** dabao. Kuch nahi aaya → browser permission check karo, aur dekho device pe subscription on hai. |
| iPhone pe button kaam nahi karta | Pehle **Add to Home Screen** karo, phir installed app se on karo. |
| Cron chala par notification nahi aaya | Vercel → Logs me `/api/cron/daily-reminder` dekho. `"sent": 0` matlab koi device subscribed nahi. |
| Entries gayab ho gayin (local) | DB file OneDrive/Dropbox folder me hai. `DATABASE_URL` sync folder se bahar karo. |
| Vercel pe site 500 de rahi | Logs dekho — agar likha hai "DATABASE_URL abhi SQLite file pe set hai", to Turso URL + auth token set karke redeploy karo. |
| Production me data reset ho raha | `DATABASE_URL` abhi `file:` pe hai. Turso URL lagao. |
| Amount galat currency me | `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` badlo, phir redeploy. |
