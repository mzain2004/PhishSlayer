"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type SessionGuardProps = {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  onUserChange?: (userId: string | null) => void;
};

export default function SessionGuard({
  children,
  loadingFallback = null,
  onUserChange,
}: SessionGuardProps) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      onUserChange?.(null);
      router.replace("/");
    } else {
      onUserChange?.(userId ?? null);
    }
  }, [isLoaded, isSignedIn, userId, onUserChange, router]);

  if (!isLoaded) {
    return loadingFallback;
  }

  return children;
}
