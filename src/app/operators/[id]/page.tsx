import { BadgeCheck, MapPin, Star, Trophy, Users } from "lucide-react";

async function getOperator(id: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/operators/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function OperatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const operator = await getOperator(id);

  if (!operator) {
    return <div className="p-6">Operator not found</div>;
  }

  return (
    <main className="space-y-6 p-6">
      <h1 className="font-bold text-3xl">{operator.operator_name}</h1>

      <div className="space-y-3 rounded-lg border p-6">
        <div className="flex items-center gap-2">
          <Trophy size={18} />
          REP Score: {operator.rep_score}
        </div>

        <div>Rank: #{operator.rank}</div>

        <div className="flex items-center gap-2">
          <Star size={18} />
          Rating: {operator.rating}
        </div>

        <div className="flex items-center gap-2">
          <Users size={18} />
          Reviews: {operator.review_count}
        </div>

        <div className="flex items-center gap-2">
          <MapPin size={18} />
          Neighborhood: {operator.neighborhood_name}
        </div>

        {operator.is_verified && (
          <div className="flex items-center gap-2 text-green-600">
            <BadgeCheck size={18} />
            Verified Business
          </div>
        )}
      </div>
    </main>
  );
}
