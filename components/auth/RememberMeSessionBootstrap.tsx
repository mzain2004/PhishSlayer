"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RememberMeSessionBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const remember = window.localStorage.getItem("phishslayer_remember_me");
    if (remember !== "true") {
      return;
    }

    const supabase = createClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      const expiresAt = data.session?.expires_at;
      if (!expiresAt) {
        return;
      }

      const isNearExpiry = expiresAt * 1000 <= Date.now() + 30_000;
      if (isNearExpiry) {
        await supabase.auth.refreshSession();
      }
    });
  }, []);

  return null;
}
