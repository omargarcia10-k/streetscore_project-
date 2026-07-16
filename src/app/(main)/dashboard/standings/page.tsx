"use client";

import { useCallback, useEffect, useState } from "react";

import Image from "next/image";

import { CheckCircle2, MapPin, Users } from "lucide-react";

import StandingsTable from "@/components/standings-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardMetrics = {
  total: number;
  active: number;
  verified: number;
};

export default function Page() {
  const [league] = useState("auto");
  const [zip] = useState("11237");
  const [window] = useState("30d");

  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total: 0,
    active: 0,
    verified: 0,
  });

  const loadDashboardData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      setLoading(true);

      const params = new URLSearchParams({
        league,
        zip,
        window,
        verified: "all",
      });

      const res = await fetch(`/api/standings?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load dashboard");
      }

      const data = await res.json();

      setMetrics({
        total: Number(data.metrics?.total ?? 0),
        active: Number(data.metrics?.active ?? 0),
        verified: Number(data.metrics?.verified ?? 0),
      });
    } catch (error) {
      console.error(error);

      setMetrics({
        total: 0,
        active: 0,
        verified: 0,
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [league, window, zip]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* INTRO */}

      <Card>
        <CardHeader>
          <CardTitle>
            <Image
              src="/images/streetscore.png"
              alt="StreetScore"
              width={1254}
              height={1254}
              className="h-auto w-[168px] object-contain"
              priority
            />
          </CardTitle>

          <CardDescription className="max-w-3xl text-base">
            Helping people discover trusted local businesses through transparent rankings based on customer ratings,
            response time, verification, and recent performance.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mt-2">
            <h3 className="mb-3 font-semibold text-sm">How StreetScore Works</h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="font-medium">⭐ Customer Rating</div>
                <p className="text-muted-foreground text-sm">30% of score</p>
              </div>

              <div>
                <div className="font-medium">⚡ Response Time</div>
                <p className="text-muted-foreground text-sm">15% of score</p>
              </div>

              <div>
                <div className="font-medium">✓ Verification</div>
                <p className="text-muted-foreground text-sm">10% of score</p>
              </div>

              <div>
                <div className="font-medium">📈 on time percent</div>
                <p className="text-muted-foreground text-sm">25% of score</p>
              </div>

              <div>
                <div className="font-medium">📈 review count</div>
                <p className="text-muted-foreground text-sm">20% of score</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DASHBOARD */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {/* TABLE */}

        <Card className="xl:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MapPin className="size-5" />

              <CardTitle>Local Standings</CardTitle>
            </div>

            <CardDescription>Rankings by league, ZIP code, and performance score.</CardDescription>
          </CardHeader>

          <CardContent>
            <StandingsTable />
          </CardContent>
        </Card>

        {/* KPI SIDEBAR */}

        <div className="flex flex-col gap-3">
          <Card className="transition hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <CardTitle className="text-sm">Total Operators</CardTitle>

              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>

            <CardContent className="pt-0">
              <div className="font-bold text-2xl">{loading ? "-" : metrics.total}</div>

              <p className="text-[11px] text-muted-foreground">All operators in this league</p>
            </CardContent>
          </Card>

          <Card className="transition hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <CardTitle className="text-sm">Active</CardTitle>

              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>

            <CardContent className="pt-0">
              <div className="font-bold text-2xl">{loading ? "-" : metrics.active}</div>

              <p className="text-[11px] text-muted-foreground">Currently operating</p>
            </CardContent>
          </Card>

          <Card className="transition hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <CardTitle className="text-sm">Verified</CardTitle>

              <CheckCircle2 className="h-5 w-5 text-blue-500" />
            </CardHeader>

            <CardContent className="pt-0">
              <div className="font-bold text-2xl">{loading ? "-" : metrics.verified}</div>

              <p className="text-[11px] text-muted-foreground">Verified operators</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
