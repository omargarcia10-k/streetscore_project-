"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StandingRow = {
  entryId: string;
  rank: number;
  name: string;
  score: number;
  responseMinutes: number | null;
  rankDelta30d?: number | null;
  distanceMiles: number | null;
  status: string;
  is_verified?: boolean;
};

export default function StandingsTable() {
  const [league, setLeague] = useState("auto");
  const [zip, setZip] = useState("11237");
  const [timeWindow, setTimeWindow] = useState("30d");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");

  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      league,
      zip,
      window: timeWindow,
      verified: verifiedFilter,
    });

    const res = await fetch(`/api/standings?${params.toString()}`);
    const data = await res.json();

    setRows(data.rows || []);
    setLoading(false);
  }, [league, zip, timeWindow, verifiedFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="flex gap-2 items-center">
        <input
          className="border p-2 rounded"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="11237"
        />

        <select className="border p-2 rounded" value={league} onChange={(e) => setLeague(e.target.value)}>
          <option value="auto">Auto Shops</option>
          <option value="re">Real Estate</option>
        </select>

        <select className="border p-2 rounded" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)}>
          <option value="7d">7 Days</option>
          <option value="30d">30 Days</option>
          <option value="90d">90 Days</option>
        </select>

        <select
          className="border p-2 rounded"
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value as "all" | "verified" | "unverified")}
        >
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Response Time</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verified</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8}>Loading...</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.entryId}>
                <TableCell>#{row.rank}</TableCell>

                <TableCell>{row.name}</TableCell>

                <TableCell>{row.score}</TableCell>

                <TableCell>{row.responseMinutes ?? "-"} min</TableCell>

                <TableCell>{row.distanceMiles ?? 0} mi</TableCell>

                <TableCell>
                  {row.rankDelta30d ? (row.rankDelta30d > 0 ? `+${row.rankDelta30d}` : row.rankDelta30d) : "-"}
                </TableCell>

                <TableCell>
                  <Badge>{row.status}</Badge>
                </TableCell>

                <TableCell>
                  <Badge className={row.is_verified ? "bg-blue-600 text-white" : "bg-gray-500 text-white"}>
                    {row.is_verified ? "Verified" : "Unverified"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
