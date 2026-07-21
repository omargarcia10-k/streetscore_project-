"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

import Image from "next/image";

import { CheckCircle2, MapPin, ShieldCheck, Store, Trophy } from "lucide-react";

import StandingsTable from "@/components/standings-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardMetrics = {
  total: number;
  active: number;
  verified: number;
};

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card className="transition hover:-translate-y-1 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>

        {icon}
      </CardHeader>

      <CardContent>
        <div className="font-bold text-3xl">{value}</div>

        <p className="text-muted-foreground text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const league = "auto";
  const neighborhood = "BROOKLYN";
  const window = "30d";

  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total: 0,
    active: 0,
    verified: 0,
  });

  const loadDashboardData = useCallback(async () => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    try {
      setLoading(true);

      const params = new URLSearchParams({
        league,
        neighborhood,
        window,
        verified: "all",
      });

      const response = await fetch(`/api/standings?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }

      const data = await response.json();

      setMetrics({
        total: Number(data.metrics?.total ?? 0),

        active: Number(data.metrics?.active ?? 0),

        verified: Number(data.metrics?.verified ?? 0),
      });
    } catch (error) {
      console.error("Dashboard loading error:", error);

      setMetrics({
        total: 0,
        active: 0,
        verified: 0,
      });
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* HERO */}

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <Image
              src="/images/streetscore.png"
              alt="StreetScore"
              width={180}
              height={180}
              className="rounded-xl"
              priority
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="size-6 text-yellow-500" />

                <CardTitle className="text-3xl">Brooklyn Auto Rankings</CardTitle>
              </div>

              <CardDescription className="max-w-3xl text-base">
                Discover the highest-performing repair shops ranked by StreetScore REP. Rankings combine customer
                ratings, reviews, verification, and business performance.
              </CardDescription>

              <div className="flex flex-wrap gap-3 text-muted-foreground text-sm">
                <span>📍 Brooklyn</span>

                <span>Updated Today</span>

                <span>Last 30 Days</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* LEADERBOARD */}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MapPin className="size-5" />

            <div>
              <CardTitle>StreetScore Leaderboard</CardTitle>

              <CardDescription>Ranked by REP Score and recent performance</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <StandingsTable />
        </CardContent>
      </Card>

      {/* STATS */}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Shops"
          value={loading ? "-" : metrics.total}
          description="Ranked operators"
          icon={<Store className="text-muted-foreground" />}
        />

        <StatCard
          title="Active Shops"
          value={loading ? "-" : metrics.active}
          description="Currently operating"
          icon={<CheckCircle2 className="text-green-500" />}
        />

        <StatCard
          title="Verified Shops"
          value={loading ? "-" : metrics.verified}
          description="Trusted operators"
          icon={<ShieldCheck className="text-blue-500" />}
        />
      </div>
    </div>
  );
}
