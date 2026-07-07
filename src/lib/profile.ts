const PROFILE_KEY = "hamsa:profile";
const RESULTS_KEY = "hamsa:results";

export const AVATARS = ["🪬", "🧭", "🏺", "⛺", "🐪", "🌊", "🌿", "🏰"];

export interface Profile {
  name: string;
  avatar: string;
  sound: boolean;
  music: boolean;
  notifications: boolean;
}

export const DEFAULT_PROFILE: Profile = {
  name: "Nomad",
  avatar: "🪬",
  sound: true,
  music: true,
  notifications: false,
};

export function loadProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Profile): void {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export interface GameResult {
  date: number;
  winner: string;
  points: number;
  longestRoad: number;
  largestArmy: number;
  players: string[];
}

export function loadResults(): GameResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as GameResult[]) : [];
  } catch {
    return [];
  }
}

export function recordResult(result: GameResult): void {
  const results = [result, ...loadResults()].slice(0, 100);
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}
