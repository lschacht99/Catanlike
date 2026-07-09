import { NextResponse } from "next/server";
import webpush from "web-push";

/**
 * Serverless "your turn" push sender (deployed only on Vercel — the GitHub
 * Pages static export excludes this file via pageExtensions, see
 * next.config.mjs). The client that just ENDED its turn calls this with the
 * WAITING player's stored subscription; dedupe already happened in the
 * Realtime Database (lastNotifiedTurnId transaction), so this endpoint just
 * signs and sends.
 */

export const runtime = "nodejs";

interface SendBody {
  subscription: webpush.PushSubscription;
  title?: string;
  body?: string;
  url?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:example@example.com";
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 503 });
  }

  let payload: SendBody;
  try {
    payload = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload?.subscription?.endpoint || !payload.subscription.keys) {
    return NextResponse.json({ error: "Missing push subscription" }, { status: 400 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  try {
    await webpush.sendNotification(
      payload.subscription,
      JSON.stringify({
        title: (payload.title || "Your turn in Hamsa Catan").slice(0, 120),
        body: (payload.body || "Open the app to play.").slice(0, 240),
        url: (payload.url || "/duo/").slice(0, 500),
      }),
      { TTL: 60 * 60 },
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    // 404/410 mean the subscription is dead; tell the client so it can clear it.
    return NextResponse.json({ error: "Push send failed", gone: status === 404 || status === 410 }, { status: 502 });
  }
}
