"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckCircle2, Minus, TrendingDown, TrendingUp } from "lucide-react";

import CompareDialog from "@/components/compare-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StandingsPageRow = {
  entryId: string;
  rank: number;
  operatorId: string;
  operatorName: string;
  operatorType: string | null;
  isVerified: boolean;
  isCurrentUser: boolean;
  status: string;
  leagueId: string;
  leagueName: string | null;
  volumeLabel: string | null;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  zipCode: string;
  timeWindow: string;
  repScore: number;
  rating: number | null;
  reviewCount: number | null;
  volumeCount: number | null;
  rankDelta30d: number | null;
  distanceMiles: number | null;
};

type ApiResponse = {
  count: number;
  rows: StandingsPageRow[];
};

function numberOrDash(value: number | null) {
  if (value == null) {
    return "-";
  }

  return value;
}

function isActiveStatus(status: string) {
  return status.toLowerCase().includes("active");
}

function RankMovement({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  if (value === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="size-4" />
        <span>—</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${value > 0 ? "text-green-600" : "text-red-600"}`}>
      {value > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
      <span>{Math.abs(value)}</span>
    </div>
  );
}

export default function StandingsRowsTable() {
  const [rows, setRows] = useState<StandingsPageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [verified, setVerified] = useState<"all" | "verified" | "unverified">("all");
  const [league, setLeague] = useState("all");
  const [neighborhood, setNeighborhood] = useState("all");
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const loadRows = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: "10000",
      });

      if (league !== "all") {
        params.set("league", league);
      }

      if (neighborhood !== "all") {
        params.set("neighborhood", neighborhood);
      }

      if (status !== "all") {
        params.set("status", status);
      }

      if (verified !== "all") {
        params.set("verified", verified);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(`/api/standings/rows?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load shops metrics");
      }

      const data = (await response.json()) as ApiResponse;
      setRows(data.rows ?? []);
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [league, neighborhood, search, status, verified]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadRows();
    }, 250);

    return () => clearTimeout(timerId);
  }, [loadRows]);

  const leagues = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.leagueId))).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const neighborhoods = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.neighborhoodName).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="w-full rounded border p-2 md:w-72"
          placeholder="Search shop name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select className="rounded border p-2" value={league} onChange={(event) => setLeague(event.target.value)}>
          <option value="all">All leagues</option>
          {leagues.map((leagueId) => (
            <option key={leagueId} value={leagueId}>
              {leagueId}
            </option>
          ))}
        </select>

        <select
          className="rounded border p-2"
          value={neighborhood}
          onChange={(event) => setNeighborhood(event.target.value)}
        >
          <option value="all">All neighborhoods</option>
          {neighborhoods.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          className="rounded border p-2"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          className="rounded border p-2"
          value={verified}
          onChange={(event) => setVerified(event.target.value as typeof verified)}
        >
          <option value="all">Any verification</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {selectedOperators.length === 2 && <Button onClick={() => setCompareOpen(true)}>Compare Operators</Button>}

      <div className="text-muted-foreground text-sm">Showing {rows.length} shop</div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Rank</TableHead>
              <TableHead>Shop Name</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Rep Score</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>Rank Change</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Shop Type</TableHead>
              <TableHead>Neighborhood</TableHead>
              <TableHead>ZIP</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12}>Loading rows...</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12}>No rows found.</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.entryId}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedOperators.includes(row.entryId)}
                      onChange={() => toggleOperator(row.entryId)}
                    />
                  </TableCell>
                  <TableCell>{row.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/operator-website?operatorId=${encodeURIComponent(row.operatorId)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {row.operatorName}
                      </a>
                      {row.isVerified ? <CheckCircle2 className="size-4 text-blue-600" aria-label="Verified" /> : null}
                    </div>
                  </TableCell>
                  <TableCell>{numberOrDash(row.rating)}</TableCell>
                  <TableCell>{row.repScore}</TableCell>
                  <TableCell>{numberOrDash(row.reviewCount)}</TableCell>
                  <TableCell>
                    <RankMovement value={row.rankDelta30d} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block size-2.5 rounded-full ${isActiveStatus(row.status) ? "bg-green-500" : "bg-slate-300"}`}
                      role="img"
                      aria-label={isActiveStatus(row.status) ? "Active" : "Inactive"}
                      title={row.status}
                    />
                  </TableCell>
                  <TableCell>{row.leagueName ?? "-"}</TableCell>
                  <TableCell>{row.volumeLabel ?? "-"}</TableCell>
                  <TableCell>{row.neighborhoodName ?? "-"}</TableCell>
                  <TableCell>{row.zipCode}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} ids={selectedOperators} />
    </div>
  );
}
