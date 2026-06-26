import { CheckCircle2, CircleDollarSign, Home, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type StandingRow = {
  entry_id: string;
  rank: number;
  operator_name: string;
  league_name: string | null;
  zip_code: string;
  rep_score: number;
  rank_delta_30d: number;
  distance_miles: number | string;
  time_window: string;
};

async function getDashboardData() {
  const [metricsResult, leagueResult, standingsResult] = await Promise.all([
    query<MetricRow>(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) AS verified, SUM(CASE WHEN is_current_user THEN 1 ELSE 0 END) AS current FROM operators`,
    ),
    query<LeagueCount>(
      `SELECT l.league_name, COUNT(*) AS count FROM operators o JOIN leagues l ON o.league_id = l.league_id GROUP BY l.league_name ORDER BY count DESC LIMIT 5`,
    ),
    query<StandingRow>(
      `SELECT entry_id, rank, operator_name, league_name, zip_code, rep_score, rank_delta_30d, distance_miles, time_window FROM standings_page_rows WHERE league_id = 'auto' AND zip_code = '11237' AND time_window = 'Last 30 days' ORDER BY rank ASC LIMIT 10`,
    ),
  ]);

  return {
    metrics: metricsResult.rows[0],
    leagues: leagueResult.rows,
    standings: standingsResult.rows,
  };
}

export default async function Page() {
  const { metrics, leagues, standings } = await getDashboardData();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CircleDollarSign className="size-5" />
              <CardTitle>Total Shops</CardTitle>
            </div>
            <CardDescription>Registered shop records in your database.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics?.total ?? "0"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="size-5" />
              <CardTitle>Active Shops</CardTitle>
            </div>
            <CardDescription>Shops currently marked active in your database.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics?.active ?? "0"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5" />
              <CardTitle>Verified Shops</CardTitle>
            </div>
            <CardDescription>Verified operators from your data.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics?.verified ?? "0"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Home className="size-5" />
              <CardTitle>Current User Shops</CardTitle>
            </div>
            <CardDescription>Shops marked as the current user.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics?.current ?? "0"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MapPin className="size-5" />
              <CardTitle>Local Standings</CardTitle>
            </div>
            <CardDescription>Top ranked auto shops in ZIP 11237 for the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>30d Delta</TableHead>
                  <TableHead>Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row) => (
                  <TableRow key={row.entry_id}>
                    <TableCell>#{row.rank}</TableCell>
                    <TableCell>{row.operator_name}</TableCell>
                    <TableCell>{row.rep_score}</TableCell>
                    <TableCell>{row.rank_delta_30d > 0 ? `+${row.rank_delta_30d}` : row.rank_delta_30d}</TableCell>
                    <TableCell>{Number(row.distance_miles).toFixed(1)} mi</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leagues</CardTitle>
            <CardDescription>Top leagues by shop count.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 py-2">
            {leagues.map((league) => (
              <div key={league.league_name} className="flex items-center justify-between gap-2 rounded-lg border p-4">
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
