import StandingsRowsTable from "@/components/standings-rows-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>All Shops</CardTitle>
          <CardDescription>
            This table shows all shops in the system, including their current standings, rank, and other relevant
            information. Use the filters above to narrow down the results.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <StandingsRowsTable />
        </CardContent>
      </Card>
    </div>
  );
}
