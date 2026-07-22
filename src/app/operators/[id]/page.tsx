"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { BadgeCheck, MapPin, ShieldCheck, Star, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Operator = {
  operator_id: string;
  operator_name: string;
  operator_type: string | null;
  status: string | null;
  address: string | null;
  is_verified: boolean | null;
  neighborhood_name: string | null;
  rating: number | null;
  review_count: number | null;
  rep_score: number | null;
  rank: number | null;
};

export default function OperatorPage() {
  const params = useParams();

  const id = params?.id as string;

  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    async function fetchOperator() {
      try {
        setLoading(true);

        const response = await fetch(`/api/operators/${id}`);

        if (!response.ok) {
          throw new Error("Failed to load operator");
        }

        const data = await response.json();

        setOperator(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    void fetchOperator();
  }, [id]);

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading operator profile...</p>
      </main>
    );
  }

  if (error || !operator) {
    return (
      <main className="p-6">
        <p className="text-red-500">{error || "Operator not found"}</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {operator.operator_name}

            {operator.is_verified && <BadgeCheck className="text-green-600" />}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin size={18} />

            <span>
              {operator.neighborhood_name ?? "Unknown neighborhood"}
              {operator.rank !== null && ` • Rank: ${operator.rank}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Star size={18} />

            <span>Rating: {operator.rating ?? "No rating"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users size={18} />

            <span>Reviews: {operator.review_count ?? 0}</span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck size={18} />

            <span>REP Score: {operator.rep_score ?? "Pending"}</span>
          </div>

          <div>
            <strong>Type:</strong> {operator.operator_type ?? "Unknown"}
          </div>

          <div>
            <strong>Status:</strong> {operator.status ?? "Unknown"}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
