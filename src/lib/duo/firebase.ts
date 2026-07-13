"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

/**
 * Lazy, env-guarded Firebase init. The GitHub Pages deployment ships with no
 * Firebase env at all — every duo screen must degrade to a friendly setup
 * notice instead of crashing, so callers check `firebaseConfigured()` first.
 */
const ENV = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export function firebaseConfigured(): boolean {
  return !!(ENV.apiKey && ENV.databaseURL && ENV.projectId);
}

let app: FirebaseApp | null = null;

export function duoDatabase(): Database {
  if (!firebaseConfigured()) {
    throw new Error("Firebase is not configured — see README_EASY_ONLINE.md");
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp({
      apiKey: ENV.apiKey!,
      authDomain: ENV.authDomain,
      databaseURL: ENV.databaseURL!,
      projectId: ENV.projectId!,
    });
  }
  return getDatabase(app);
}
