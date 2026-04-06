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
          "linear-gradient(135deg, #4a3f7a 0%, #1a4a4a 50%, #0d2b2b 100%)",
      }}
    >
      <Sidebar />
      <main className="relative z-10 flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-6">
        <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
      </main>
    </div>
  );
}

