import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      <Sidebar mobileOpen={false} onCloseMobile={() => {}} />

      <div className="flex-1 overflow-auto md:ml-[240px]">{children}</div>
    </div>
  );
}
