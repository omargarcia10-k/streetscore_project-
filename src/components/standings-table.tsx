"use client";

import { useCallback, useEffect, useState } from "react";

import { Star, TrendingDown, TrendingUp } from "lucide-react";

import CompareDialog from "@/components/compare-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StandingRow = {
  entryId: string;
  rank: number;
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
  const value = Number(change);

  if (!value) return "-";

  return (
    <div className={`flex items-center gap-1 ${value > 0 ? "text-green-600" : "text-red-600"}`}>
      {value > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}

      {value > 0 ? `+${value}` : value}
    </div>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";

  return `#${rank}`;
}

function getStatusBadgeClass(status: string) {
  const active = status.toLowerCase().includes("active");

  return active ? "!border-green-600 !bg-green-600 !text-white" : "!border-slate-300 !bg-slate-200 !text-slate-800";
}

function getStatusBadgeStyle(status: string) {
  const active = status.toLowerCase().includes("active");

  if (!active) return undefined;

  return {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
    color: "#ffffff",
  };
}

function getVerifiedBadgeClass(isVerified?: boolean) {
  return isVerified ? "!border-blue-600 !bg-blue-600 !text-white" : "!border-slate-300 !bg-slate-200 !text-slate-800";
}

export default function StandingsTable() {
  const [league, setLeague] = useState("auto");
  const [neighborhood, setNeighborhood] = useState("Bushwick");
  const [window, setWindow] = useState("30d");

  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const loadData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      setLoading(true);

      const params = new URLSearchParams({
        league,
        neighborhood,
        window,
        verified: verifiedFilter,
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

  function toggleOperator(id: string) {
    setSelectedOperators((previous) => {
      if (previous.includes(id)) {
        return previous.filter((operatorId) => operatorId !== id);
      }

      if (previous.length < 2) {
        return [...previous, id];
      }

      return previous;
    });
  }

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
          <option value="Park Slope">Park Slope</option>
          <option value="Bushwick">Bushwick</option>
          <option value="Bushwick North">Bushwick North</option>
          <option value="Williamsburg">Williamsburg</option>
        </select>

        <select className="rounded border p-2" value={league} onChange={(e) => setLeague(e.target.value)}>
          <option value="auto">Auto Shops</option>
          <option value="re">Real Estate</option>
        </select>

        <select className="rounded border p-2" value={window} onChange={(e) => setWindow(e.target.value)}>
          <option value="7d">7 Days</option>
          <option value="30d">30 Days</option>
          <option value="90d">90 Days</option>
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

      {selectedOperators.length === 2 && <Button onClick={() => setCompareOpen(true)}>Compare Operators</Button>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead>Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verified</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={10}>Loading...</TableCell>
            </TableRow>
          ) : (
            filteredRows.map((row) => (
              <TableRow key={row.entryId}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedOperators.includes(row.entryId)}
                    onChange={() => toggleOperator(row.entryId)}
                  />
                </TableCell>

                <TableCell>
                  <RankDisplay rank={row.rank} />
                </TableCell>

                <TableCell>{row.name}</TableCell>
                <TableCell>{row.score}</TableCell>
                <TableCell>{row.rating ? <RatingStars rating={row.rating} /> : "-"}</TableCell>
                <TableCell>{row.reviewCount ?? "-"}</TableCell>

                <TableCell>
                  <RankChange change={row.rankDelta30d} />
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={getStatusBadgeClass(row.status)}
                    style={getStatusBadgeStyle(row.status)}
                  >
                    {row.status}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={getVerifiedBadgeClass(row.is_verified)}>
                    {row.is_verified ? "Verified" : "Unverified"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} ids={selectedOperators} />
    </div>
  );
}
