import { CheckCircle2, CircleDollarSign, Home, MapPin, Users } from "lucide-react";

import StandingsTable from "@/components/standings-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { query } from "@/lib/db";

type MetricRow = {
  total: string;
  active: string;
  verified: string;
  current: string;
};

type LeagueCount = {
  league_name: string;
  count: string;
};

const EMPTY_METRICS: MetricRow = {
  total: "0",
  active: "0",
  verified: "0",
  current: "0",
};

async function getDashboardData() {
  const [metricsResult, leagueResult] = await Promise.all([
    query<MetricRow>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN is_current_user THEN 1 ELSE 0 END) AS current
      FROM operators`,
    ),
    query<LeagueCount>(
      `SELECT l.league_name, COUNT(*) AS count
       FROM operators o
       JOIN leagues l ON o.league_id = l.league_id
       GROUP BY l.league_name
       ORDER BY count DESC
       LIMIT 5`,
    ),
  ]);

  return {
    metrics: metricsResult.rows[0] ?? EMPTY_METRICS,
    leagues: leagueResult.rows,
  };
}

export default async function Page() {
  const { metrics, leagues } = await getDashboardData();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* METRICS */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CircleDollarSign className="size-5" />
              <CardTitle>Total Shops</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="size-5" />
              <CardTitle>Active Shops</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-blue-500" />
              <CardTitle>Verified Shops</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-blue-500">{metrics.verified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Home className="size-5" />
              <CardTitle>Current User Shops</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.current}</div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN SECTION */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MapPin className="size-5" />
              <CardTitle>Local Standings</CardTitle>
            </div>
            <CardDescription>Top ranked auto shops (filterable)</CardDescription>
          </CardHeader>

          <CardContent>
            <StandingsTable />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leagues</CardTitle>
            <CardDescription>Top leagues by shop count.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 py-2">
            {leagues.map((league) => (
              <div key={league.league_name} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-semibold">{league.league_name}</p>
                  <p className="text-sm text-muted-foreground">Shops in this league</p>
                </div>
                <Badge>{league.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
