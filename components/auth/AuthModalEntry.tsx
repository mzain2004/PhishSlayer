"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type AuthModalView = "login" | "signup" | "forgot";

type AuthModalEntryProps = {
  defaultModal: AuthModalView;
};

export default function AuthModalEntry({ defaultModal }: AuthModalEntryProps) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Clerk's managed auth pages
    if (defaultModal === "signup") {
      router.replace("/sign-up");
    } else {
      router.replace("/sign-in");
    }
  }, [defaultModal, router]);

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </main>
  );
}
