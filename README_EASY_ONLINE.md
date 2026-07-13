# Easy Online (2–4 Players) — Free Setup Guide

Play **Hamsa Nomads** with 2–4 players (you + your wife, friends, or a mix of humans and
bots) from **anywhere** — different Wi-Fi, cellular, different cities. No LAN, no accounts,
no App Store, no Apple Developer account. The whole stack is free:

| Piece | Service | Free tier |
|---|---|---|
| Hosting + serverless push endpoint | [Vercel](https://vercel.com) | Hobby plan |
| Live game sync | [Firebase Realtime Database](https://firebase.google.com/docs/database/web/start) | Spark plan |
| "Your turn" notifications | Web Push (VAPID) + PWA | free, built into browsers |

How it works: the host creates a **private 6-digit room code** (plus an optional PIN).
The other phone joins by code, invite link, or QR. Game state lives at
`/rooms/{roomId}` in the Realtime Database; both phones stay in sync live. Only the
current player can act — out-of-turn or stale moves are rejected server-side by a
revision check. When you end your turn, the other phone gets a push notification:
**"Your turn in Hamsa Catan"**.

> **Note on variable names:** this project is **Next.js**, not Vite. Vite-style
> variables (`VITE_FIREBASE_API_KEY`, …) are never exposed to the browser by Next.js —
> the working equivalents use the `NEXT_PUBLIC_` prefix. Same values, Next names.
> They're all listed in [`.env.example`](./.env.example).

---

## Step-by-step setup (non-expert friendly)

### 1) Create a Firebase project
1. Go to <https://console.firebase.google.com> and sign in with any Google account.
2. **Add project** → name it anything (e.g. `hamsa-duo`) → Analytics off is fine → **Create**.

Official docs: <https://firebase.google.com/docs/web/setup>

### 2) Enable Realtime Database
1. In the Firebase console: **Build → Realtime Database → Create database**.
2. Pick the location closest to you → start in **test mode** for your first game.
3. For a private prototype, replace the rules (Realtime Database → Rules) with:
   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": { ".read": true, ".write": true }
       }
     }
   }
   ```
   Privacy comes from the unguessable room code + optional PIN. (Good enough for a
   2-person prototype; don't store anything sensitive.)

Official docs: <https://firebase.google.com/docs/database/web/start>

### 3) Copy the web config into `.env.local`
1. Firebase console → **Project settings (gear) → Your apps → Web app (</>)** → register an app.
2. It shows a config object. Copy `.env.example` to `.env.local` and fill in:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=…        # apiKey
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…    # authDomain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=…   # databaseURL  (from the Realtime Database page)
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=…     # projectId
   ```

### 4) Generate VAPID keys (for push)
```bash
npx web-push generate-vapid-keys
```
Copy the output into `.env.local`:
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…   # "Public Key"
VAPID_PRIVATE_KEY=…              # "Private Key" — keep secret
VAPID_SUBJECT=mailto:you@example.com
```

### 5) Deploy to Vercel
1. Push this repo to your GitHub.
2. Go to <https://vercel.com/new>, import the repo. Framework = **Next.js**, defaults are fine.
3. Deploy. You'll get a URL like `https://hamsa-duo.vercel.app`.

Docs: <https://vercel.com/docs/frameworks/frontend/vite> (Vercel general framework docs; this repo deploys as Next.js) · <https://vite.dev/guide/static-deploy> (background on static deploys)

### 6) Add the environment variables in Vercel
Vercel → your project → **Settings → Environment Variables** → add **all** the variables
from step 3–4 (same names, same values) → **Redeploy** (Deployments → ⋯ → Redeploy).

### 7) Open the URL on both phones
Open `https://<your-app>.vercel.app/duo/` on your phone and your wife's phone.
Works on any network — Wi-Fi at home, cellular on a bus.

### 8) iPhone: Add to Home Screen + Enable Notifications
On each iPhone (required for push on iOS):
1. Open the Vercel URL in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Open the app **from the Home Screen icon** (not from Safari).
4. Inside your game room, tap **“Enable turn notifications”** and allow.

Official docs: <https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers> ·
<https://developer.mozilla.org/en-US/docs/Web/API/Push_API>

### 9) Create / join a room
- Phone A (host): **/duo → Create room** — pick the player count (2–4) and set each seat
  to **Human** (name only) or **Bot** (difficulty: easy/normal/hard, default normal), an
  optional PIN, Standard or Cities & Knights → **Create**. You get a 6-digit code, an
  invite link, and a QR code. Bots need no invite — they run on the host's phone, so keep
  the app open on their turns.
- Other phones: scan the QR / tap the link, or **/duo → Join room** and type the code
  (+ PIN). Each joiner is given the next free human seat.
- Play! Only the current player can act; the other phone shows “<name>’s turn” and gets
  a push when it becomes theirs. Refreshing or losing signal is fine — reopening the
  room loads the latest state.

### 10) Troubleshooting
| Symptom | Check |
|---|---|
| No notifications at all | Push needs **HTTPS** (the Vercel URL, not localhost), and on iPhone the app must be opened **from the Home Screen icon** with permission granted. |
| Notifications stopped | iOS **Focus mode** silences them; check Settings → Focus. |
| Delayed/never arrives on iPhone | **Low Power Mode** delays background push. |
| “Room not found” or nothing syncs | Firebase **Realtime Database rules** (step 2) and that `NEXT_PUBLIC_FIREBASE_DATABASE_URL` matches your database page. |
| Lobby says “Setup needed” | The **Vercel env vars** (step 6) are missing — add them and redeploy. |
| Push button errors | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` missing in Vercel, or permission denied in the browser site settings. |

---

## What's enforced where

- **Turn lock:** clients propose actions; the room's revision + active player are
  re-checked in a database transaction. Out-of-turn / stale proposals are rejected and
  the losing phone silently re-syncs.
- **Push dedupe:** exactly one notification per turn change (`lastNotifiedTurnId` is
  claimed atomically) — building three roads in one turn never spams.
- **Fallback:** when the app is open, you get an in-app banner + vibration + chime
  instead of relying on push.
- **Subscriptions:** stored per player in the room; the 🔔 button toggles
  subscribe/unsubscribe any time.
