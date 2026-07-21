"use client";

import { useCallback, useEffect, useState } from "react";

import { CheckCircle2, Minus, Search, Star, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StandingRow = {
  entryId: string;
  rank: number;
  operatorId: string;
  name: string;
  score: number | string;
  rating?: number | string | null;
  reviewCount?: number | string | null;
  rankDelta30d?: number | string | null;
  status: string;
  is_verified?: boolean;
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";

  return `#${rank}`;
}

function ScoreBar({ score }: { score: number | string }) {
  const value = Number(score);

  const label = value >= 90 ? "Elite" : value >= 80 ? "Excellent" : value >= 70 ? "Good" : "Fair";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{value}</span>

        <span className="text-muted-foreground">{label}</span>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{
            width: `${Math.min(value, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function Rating({ value }: { value?: number | string | null }) {
  if (!value) {
    return "-";
  }

  return (
    <div className="flex items-center gap-1">
      <Star size={15} className="fill-yellow-400 text-yellow-400" />

      {Number(value).toFixed(1)}
    </div>
  );
}

function RankMovement({ value }: { value?: number | string | null }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">New</span>;
  }

  const delta = Number(value);

  if (delta === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus size={15} />—
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
      {delta > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}

      {Math.abs(delta)}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const active = status.toLowerCase().includes("active");

  return <span className={`block size-3 rounded-full ${active ? "bg-green-500" : "bg-gray-300"}`} title={status} />;
}

function TopThree({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {rows.map((row) => (
        <Card key={row.entryId} className="transition hover:-translate-y-1 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>
                {RankBadge({
                  rank: row.rank,
                })}
              </span>

              <span className="text-2xl">{row.score}</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="font-semibold">{row.name}</div>

            <Rating value={row.rating} />

            <ScoreBar score={row.score} />

            {row.is_verified && (
              <Badge>
                <CheckCircle2 className="mr-1 size-3" />
                Verified
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function StandingsTable() {
  const [rows, setRows] = useState<StandingRow[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [league, setLeague] = useState("auto");

  // Keep API name neighborhood
  // UI represents borough
  const [neighborhood, setNeighborhood] = useState("BROOKLYN");

  const [verified, setVerified] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        league,
        neighborhood,
        window: "30d",
        verified,
        limit: "10",
      });

      const response = await fetch(`/api/standings?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed loading standings");
      }

      const data = await response.json();

      setRows(data.rows ?? []);
    } catch (error) {
      console.error(error);

      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [league, neighborhood, verified]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = rows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <TopThree rows={filteredRows.slice(0, 3)} />

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <Search size={18} />

          <input
            className="bg-transparent outline-none"
            placeholder="Search shops..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="rounded border p-2"
          value={neighborhood}
          onChange={(event) => setNeighborhood(event.target.value)}
        >
          <option value="BROOKLYN">Brooklyn</option>

          <option value="QUEENS">Queens</option>

          <option value="MANHATTAN">Manhattan</option>

          <option value="BRONX">Bronx</option>

          <option value="STATEN ISLAND">Staten Island</option>
        </select>

        <select className="rounded border p-2" value={league} onChange={(event) => setLeague(event.target.value)}>
          <option value="auto">Auto Shops</option>
        </select>

        <select className="rounded border p-2" value={verified} onChange={(event) => setVerified(event.target.value)}>
          <option value="all">All</option>

          <option value="verified">Verified</option>

          <option value="unverified">Unverified</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>

            <TableHead>Shop</TableHead>

            <TableHead>REP Score</TableHead>

            <TableHead>Rating</TableHead>

            <TableHead>Reviews</TableHead>

            <TableHead>Trend</TableHead>

            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7}>Loading...</TableCell>
            </TableRow>
          ) : (
            filteredRows.map((row) => (
              <TableRow key={row.entryId} className={row.rank <= 10 ? "bg-muted/30" : ""}>
                <TableCell className="font-bold">
                  {RankBadge({
                    rank: row.rank,
                  })}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/operator-website?operatorId=${encodeURIComponent(row.operatorId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {row.name}
                    </a>

                    {row.is_verified && <CheckCircle2 className="size-4 text-blue-600" />}
                  </div>
                </TableCell>

                <TableCell className="min-w-[160px]">
                  <ScoreBar score={row.score} />
                </TableCell>

                <TableCell>
                  <Rating value={row.rating} />
                </TableCell>

                <TableCell>{row.reviewCount ?? "-"}</TableCell>

                <TableCell>
                  <RankMovement value={row.rankDelta30d} />
                </TableCell>

                <TableCell>
                  <StatusDot status={row.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
