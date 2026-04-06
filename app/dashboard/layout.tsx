import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/dashboard/Sidebar";
import { DashboardErrorBoundary } from "./components/ErrorBoundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div
      className="relative flex h-screen flex-row overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #1a1a3e 30%, #0d2b2b 70%, #0D1117 100%)",
      }}
    >
      <div className="shrink-0 bg-transparent pt-3 pb-3 pl-3">
        <Sidebar />
      </div>
      <main className="relative z-10 flex-1 min-w-0 overflow-y-auto overflow-x-hidden pt-3 pr-3 pb-3 pl-0">
        <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
      </main>
    </div>
  );
}

