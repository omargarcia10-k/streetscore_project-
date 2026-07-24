"use client";

import { useEffect, useState } from "react";

import { BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Operator = {
  entryId: string;
  name: string;
  rank: number;
  score: number;
  rating?: number | string | null;
  reviewCount?: number;
  neighborhood?: string;
  status: string;
  is_verified: boolean;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>

      <p className="font-semibold text-xl">{value}</p>
    </div>
  );
}

function VerificationBadge({ verified }: { verified: boolean }) {
  if (!verified) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-green-600">
      <BadgeCheck size={16} />
      Verified Business
    </div>
  );
}

function OperatorCard({ operator }: { operator: Operator }) {
  const metrics = [
    {
      label: "REP Score",
      value: operator.score,
    },
    {
      label: "Rating",
      value: operator.rating ? `⭐ ${operator.rating}` : "-",
    },
    {
      label: "Reviews",
      value: operator.reviewCount ?? "-",
    },
    {
      label: "Neighborhood",
      value: operator.neighborhood ?? "-",
    },
    {
      label: "Status",
      value: operator.status,
    },
  ];

  return (
    <Card className="w-full rounded-2xl shadow-sm">
      <CardContent className="space-y-6 p-full">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="font-bold text-2xl">{operator.name}</h2>

            <VerificationBadge verified={operator.is_verified} />
          </div>

          <Badge variant="outline">Rank #{operator.rank}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompareContent({ ids }: { ids: string[] }) {
  const [operators, setOperators] = useState<Operator[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadComparison() {
      try {
        if (ids.length !== 2) {
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/standings/compare?ids=${encodeURIComponent(ids.join(","))}`);

        if (!response.ok) {
          throw new Error("Unable to fetch comparison");
        }

        const data = await response.json();

        setOperators(data);
      } catch (error) {
        console.error(error);

        setError("Unable to load comparison data");
      } finally {
        setLoading(false);
      }
    }

    void loadComparison();
  }, [ids]);

  if (loading) {
    return <div className="p-6">Loading comparison...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (operators.length !== 2) {
    return (
      <div className="p-6">
        <h1 className="font-bold text-xl">Select two operators to compare</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl">Compare Operators</h1>

        <p className="text-muted-foreground">Analyze reputation, reliability, and performance metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {operators.map((operator) => (
          <OperatorCard key={operator.entryId} operator={operator} />
        ))}
      </div>
    </div>
  );
}
