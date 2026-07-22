"use client";

import { useState } from "react";

import { BadgeCheck, MapPin, Star, Trophy, Users, X } from "lucide-react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type Operator = {
  operator_id: string;
  operator_name: string;
  neighborhood_name: string | null;
  rep_score: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  operator_type?: string;
  website?: string | null;
};

export default function OperatorHoverCard({ operator }: { operator: Operator }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
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
              {operator.neighborhood_name ?? "Unknown"}
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

            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="block w-full rounded-md bg-black px-3 py-2 text-center text-sm text-white"
            >
              View Full Profile
            </button>
          </div>
        </HoverCardContent>
      </HoverCard>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close profile"
            onClick={() => setExpanded(false)}
          />

          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">{operator.operator_name}</h2>

              <button type="button" onClick={() => setExpanded(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {operator.is_verified && (
                <div className="flex items-center gap-1 text-green-600">
                  <BadgeCheck size={16} />
                  Verified Business
                </div>
              )}

              <div className="flex gap-2">
                <MapPin size={16} />
                {operator.neighborhood_name ?? "Unknown"}
              </div>

              <div className="flex gap-2">
                <Trophy size={16} />
                REP Score:
                <strong>{operator.rep_score}</strong>
              </div>

              <div className="flex gap-2">
                <Star size={16} />
                {operator.rating}/5
              </div>

              <div className="flex gap-2">
                <Users size={16} />
                {operator.review_count} reviews
              </div>

              <div>Type: {operator.operator_type ?? "Unknown"}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
