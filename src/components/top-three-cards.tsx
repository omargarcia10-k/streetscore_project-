"use client";

import { BadgeCheck, MapPin, Star, Trophy, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  website?: string | null;
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";

  return `#${rank}`;
}

type TopThreeProps = {
  rows: StandingRow[];
  onSelect: (operatorId: string) => void;
};

export default function TopThree({ rows, onSelect }: TopThreeProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {rows.slice(0, 3).map((row) => (
        <Card
          key={row.entryId}
          onClick={() => onSelect(row.operatorId)}
          className="cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
        >
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>
                <RankBadge rank={row.rank} />
              </span>

              <span className="text-2xl">{row.score}</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="font-semibold text-lg">{row.name}</div>

            <div className="mt-4 space-y-3">
              {row.is_verified && (
                <div className="flex items-center gap-1 text-green-600">
                  <BadgeCheck size={16} />
                  Verified Business
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <MapPin size={15} />
                Brooklyn
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Trophy size={15} />
                REP Score:
                <strong>{row.score}</strong>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Star size={15} />
                {row.rating ?? "No rating"}/5
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users size={15} />
                {row.reviewCount ?? 0} reviews
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
