"use client";

import { BadgeCheck, MapPin, Star, Trophy, Users } from "lucide-react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type Operator = {
  operator_id: string;
  operator_name: string;
  neighborhood_name: string;
  rep_score: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  operator_type?: string;
  website?: string | null;
};

export default function OperatorHoverCard({ operator }: { operator: Operator }) {
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <a
          href={operator.website ?? `https://www.google.com/search?q=${encodeURIComponent(operator.operator_name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline"
        >
          {operator.operator_name}
        </a>
      </HoverCardTrigger>

      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <h3 className="font-bold text-lg">{operator.operator_name}</h3>

          {operator.is_verified && (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <BadgeCheck size={16} />
              Verified Business
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <MapPin size={16} />
            {operator.neighborhood_name}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Trophy size={16} />
            REP Score:
            <strong>{operator.rep_score}</strong>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Star size={16} />
            {operator.rating}/5
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users size={16} />
            {operator.review_count} reviews
          </div>

          <a
            href={`/operators/${operator.operator_id}`}
            className="block rounded-md bg-black px-3 py-2 text-center text-sm text-white"
          >
            View Full Profile
          </a>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
