import { createBrowserClient } from "@supabase/ssr";

const REMEMBER_ME_KEY = "phishslayer_remember_me";

function getRememberPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(REMEMBER_ME_KEY) === "true";
}

function getBrowserStorage(rememberMe: boolean): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return rememberMe ? window.localStorage : window.sessionStorage;
}

export function createClient() {
  const rememberMe = getRememberPreference();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: getBrowserStorage(rememberMe),
      },
    },
  );
}

export function createClientWithRememberMe(rememberMe: boolean) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: rememberMe,
        autoRefreshToken: true,
        storage: getBrowserStorage(rememberMe),
      },
    },
  );
}

export function setRememberMePreference(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(REMEMBER_ME_KEY, "true");
    return;
  }

  window.localStorage.removeItem(REMEMBER_ME_KEY);
}
