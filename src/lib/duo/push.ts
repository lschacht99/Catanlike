"use client";

/**
 * Web Push client plumbing: service-worker registration, subscribe /
 * unsubscribe with the VAPID public key, and the call to the serverless
 * /api/send-turn-notification endpoint (a Vercel function — on the GitHub
 * Pages deployment it simply 404s and the send is silently skipped, because
 * push needs the Vercel deployment anyway).
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(`${BASE_PATH}/service-worker.js`);
  } catch {
    return null;
  }
}

function vapidKeyBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

/**
 * Ask permission and subscribe. Returns the subscription serialized as JSON
 * (ready to store in the room), or a reason string when it can't happen.
 */
export async function enableTurnNotifications(): Promise<
  { ok: true; subscriptionJson: string } | { ok: false; reason: string }
> {
  if (!pushSupported()) {
    return { ok: false, reason: "This browser doesn't support web push. On iPhone: install the app to your Home Screen first (Safari → Share → Add to Home Screen), then open it from there." };
  }
  if (!pushConfigured()) {
    return { ok: false, reason: "Push isn't configured on this deployment (missing NEXT_PUBLIC_VAPID_PUBLIC_KEY)." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Notification permission was not granted." };
  }
  const registration = await registerServiceWorker();
  if (!registration) return { ok: false, reason: "Service worker failed to register (push needs HTTPS)." };
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBuffer(VAPID_PUBLIC_KEY),
    }));
  return { ok: true, subscriptionJson: JSON.stringify(subscription.toJSON()) };
}

export async function disableTurnNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration(`${BASE_PATH}/service-worker.js`);
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
}

/** Fire the serverless push. Best-effort: any failure is swallowed. */
export async function sendTurnPush(args: {
  subscriptionJson: string;
  title: string;
  body: string;
  url: string;
}): Promise<void> {
  try {
    await fetch(`${BASE_PATH}/api/send-turn-notification`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription: JSON.parse(args.subscriptionJson),
        title: args.title,
        body: args.body,
        url: args.url,
      }),
    });
  } catch {
    // No endpoint on this deployment (e.g. GitHub Pages) — in-app banner
    // remains the fallback.
  }
}
