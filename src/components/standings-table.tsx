"use client";

import { useCallback, useEffect, useState } from "react";

import { CheckCircle2, Minus, Star, TrendingDown, TrendingUp } from "lucide-react";

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

function RatingStars({ rating }: { rating: number | string }) {
  return (
    <div className="flex items-center gap-1">
      <Star size={15} className="fill-yellow-400 text-yellow-400" />
      <span>{Number(rating).toFixed(1)}</span>
    </div>
  );
}

function RankChange({ change }: { change?: number | string | null }) {
  if (change == null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  const value = Number(change);

  if (Number.isNaN(value)) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  if (value === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus size={15} />
        <span>—</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${value > 0 ? "text-green-600" : "text-red-600"}`}>
      {value > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}

      {Math.abs(value)}
    </div>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";

  return `#${rank}`;
}

function isActiveStatus(status: string) {
  return status.toLowerCase().includes("active");
}

export default function StandingsTable() {
  const [league, setLeague] = useState("auto");
  const [neighborhood, setNeighborhood] = useState("Brooklyn");
  const [window, setWindow] = useState("30d");

  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      setLoading(true);

      const params = new URLSearchParams({
        league,
        neighborhood: neighborhood.toUpperCase(),
        window,
        verified: verifiedFilter,
        limit: "10",
      });

      const response = await fetch(`/api/standings?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load standings");
      }

      const data = await response.json();

      setRows(data.rows ?? []);
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [league, neighborhood, window, verifiedFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadData]);

  const filteredRows = rows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded border p-2"
          placeholder="Search operators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="rounded border p-2" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
          <option value="Brooklyn">Brooklyn</option>
        </select>

        <select className="rounded border p-2" value={league} onChange={(e) => setLeague(e.target.value)}>
          <option value="auto">Auto Shops</option>
          <option value="re">Real Estate</option>
        </select>

        <select className="rounded border p-2" value={window} onChange={(e) => setWindow(e.target.value)}>
          <option value="30d">30 Days</option>
        </select>

        <select
          className="rounded border p-2"
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value as "all" | "verified" | "unverified")}
        >
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Rank Change</TableHead>
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
              <TableRow key={row.entryId}>
                <TableCell>
                  <RankDisplay rank={row.rank} />
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/operator-website?operatorId=${encodeURIComponent(row.operatorId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      {row.name}
                    </a>
                    {row.is_verified ? <CheckCircle2 className="size-4 text-blue-600" aria-label="Verified" /> : null}
                  </div>
                </TableCell>
                <TableCell>{row.score}</TableCell>
                <TableCell>{row.rating ? <RatingStars rating={row.rating} /> : "-"}</TableCell>
                <TableCell>{row.reviewCount ?? "-"}</TableCell>

                <TableCell>
                  <RankChange change={row.rankDelta30d} />
                </TableCell>

                <TableCell>
                  <span
                    className={`inline-block size-2.5 rounded-full ${isActiveStatus(row.status) ? "bg-green-500" : "bg-slate-300"}`}
                    role="img"
                    aria-label={isActiveStatus(row.status) ? "Active" : "Inactive"}
                    title={row.status}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
