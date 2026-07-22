"use client";

import { useCallback, useEffect, useState } from "react";

import Image from "next/image";

import { Minus, Search, TrendingDown, TrendingUp } from "lucide-react";

import CompareDialog from "@/components/compare-dialog";
import OperatorHoverCard from "@/components/operator-hover-card";
import TopThree from "@/components/top-three-cards";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StandingRow = {
  entryId: string;
  rank: number;
  operatorId: string;
  name: string;

  neighborhoodName?: string | null;

  score: number | string;
  rating?: number | string | null;
  reviewCount?: number | string | null;
  rankDelta30d?: number | string | null;
  status: string;
  is_verified?: boolean;
  website?: string | null;
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";

  return `#${rank}`;
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

export default function StandingsTable() {
  const [rows, setRows] = useState<StandingRow[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [league, setLeague] = useState("auto");

  const [neighborhood, setNeighborhood] = useState("BROOKLYN");

  const [verified, setVerified] = useState("all");

  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);

  const [compareOpen, setCompareOpen] = useState(false);

  function toggleOperator(operatorId: string) {
    setSelectedOperators((previous) => {
      if (previous.includes(operatorId)) {
        return previous.filter((id) => id !== operatorId);
      }

      if (previous.length < 2) {
        return [...previous, operatorId];
      }

      return previous;
    });
  }

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

  const neighborhoodLabel = neighborhood
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const topThreeRows = filteredRows.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex shrink-0 justify-center md:justify-start">
            <Image
              src="/images/streetscorelogo.png"
              alt="StreetScore"
              width={240}
              height={240}
              className="h-auto w-44 md:w-56"
              priority
            />
          </div>

          <div className="space-y-4">
            <h1 className="font-semibold text-3xl text-foreground tracking-tight md:text-5xl">
              🏆 {neighborhoodLabel} Auto Rankings
            </h1>

            <p className="max-w-5xl text-lg text-muted-foreground md:text-2xl">
              Discover the highest-performing repair shops ranked by StreetScore REP. Rankings combine customer ratings,
              reviews, verification, and business performance.
            </p>

            <p className="text-base text-muted-foreground md:text-lg">
              📍 {neighborhoodLabel} &nbsp; Updated Today &nbsp; Last 30 Days
            </p>
          </div>
        </div>
      </section>

      <TopThree rows={topThreeRows} />

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

      {selectedOperators.length === 2 && <Button onClick={() => setCompareOpen(true)}>Compare Operators</Button>}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />

              <TableHead>Rank</TableHead>

              <TableHead>Shop</TableHead>

              <TableHead>Trend</TableHead>

              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading...</TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No shops found.</TableCell>
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

                  <TableCell className="font-bold">
                    {RankBadge({
                      rank: row.rank,
                    })}
                  </TableCell>

                  <TableCell>
                    <OperatorHoverCard
                      operator={{
                        operator_id: row.operatorId,
                        operator_name: row.name,
                        neighborhood_name: row.neighborhoodName ?? neighborhood,
                        rep_score: Number(row.score),
                        rating: Number(row.rating ?? 0),
                        review_count: Number(row.reviewCount ?? 0),
                        is_verified: Boolean(row.is_verified),
                        website: row.website,
                      }}
                    />
                  </TableCell>

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

      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} ids={selectedOperators} />
    </div>
  );
}
