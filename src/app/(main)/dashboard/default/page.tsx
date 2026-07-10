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
      <Card>
  <CardHeader>
    <CardTitle className="text-3xl font-bold">
      StreetScore
    </CardTitle>

    <CardDescription className="max-w-3xl text-base">
      Helping people discover trusted local businesses through transparent
      rankings based on real performance, reputation, and verified results.
    </CardDescription>
  </CardHeader>
</Card>

      {/* MAIN SECTION */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MapPin className="size-5" />
              <CardTitle>Local Standings</CardTitle>
            </div>
            <CardDescription>Top ranked auto shops (filterable)</CardDescription>
          </CardHeader>

          <CardContent className="w-full p-6">
  <StandingsTable />
</CardContent>
        </Card>
      </div>
    </div>
  );
}