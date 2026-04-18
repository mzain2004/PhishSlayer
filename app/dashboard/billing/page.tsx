"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

type BillingTier = "free" | "pro" | "enterprise";

type SubscriptionPayload = {
  tier: BillingTier;
  status: string;
  current_period_end: string | null;
  features: {
    scans: number;
    users: number;
    agents: number;
    orgs: number;
  };
};

const tierLabels: Record<BillingTier, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

function prettyLimit(value: number) {
  return value < 0 ? "Unlimited" : String(value);
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionPayload | null>(
    null,
  );

  useEffect(() => {
    async function loadSubscription() {
      try {
        const response = await fetch("/api/billing/subscription", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load subscription");
        }
        const payload = (await response.json()) as SubscriptionPayload;
        setSubscription(payload);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load billing",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSubscription();
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Failed to open billing portal");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open billing portal",
      );
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading || !subscription) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl text-white">
      <DashboardCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="dashboard-section-heading text-white">
              Billing Overview
            </h2>
            <p className="mt-1 text-sm text-white/70">
              Manage your subscription and feature limits.
            </p>
          </div>

          {subscription.tier === "free" ? (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-teal-200"
            >
              <Shield className="h-4 w-4" />
              Upgrade Plan
            </Link>
          ) : (
            <button
              onClick={() => void openPortal()}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-60"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Manage Subscription
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <DashboardCard className="bg-black/20 p-4">
            <p className="dashboard-card-label">Plan</p>
            <p className="dashboard-metric-value mt-1">
              {tierLabels[subscription.tier]}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 p-4">
            <p className="dashboard-card-label">Status</p>
            <div className="mt-2">
              <StatusBadge
                status={
                  subscription.status === "active" ? "healthy" : "pending"
                }
                label={subscription.status}
              />
            </div>
          </DashboardCard>
          <DashboardCard className="bg-black/20 p-4">
            <p className="dashboard-card-label">Renews</p>
            <p className="dashboard-metric-value mt-1">
              {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : "N/A"}
            </p>
          </DashboardCard>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <DashboardCard className="bg-black/20 p-4">
            <p className="dashboard-card-label">Scans</p>
            <p className="dashboard-metric-value mt-1">
              {prettyLimit(subscription.features.scans)}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 p-4">
            <p className="dashboard-card-label">Users</p>
            <p className="dashboard-metric-value mt-1">
              {prettyLimit(subscription.features.users)}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 p-4">
            <p className="dashboard-card-label">Agents</p>
            <p className="dashboard-metric-value mt-1">
              {prettyLimit(subscription.features.agents)}
            </p>
          </DashboardCard>
          <DashboardCard className="bg-black/20 p-4">
            <p className="dashboard-card-label">Organizations</p>
            <p className="dashboard-metric-value mt-1">
              {prettyLimit(subscription.features.orgs)}
            </p>
          </DashboardCard>
        </div>
      </DashboardCard>
    </div>
  );
}
