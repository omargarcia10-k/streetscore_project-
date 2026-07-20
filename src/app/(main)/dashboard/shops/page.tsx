import StandingsRowsTable from "@/components/standings-rows-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>All Shops Metrics</CardTitle>
          <CardDescription>
            Full standings_page_rows view data across all shops, including ranking, reputation, review, and metadata
            fields.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <StandingsRowsTable />
        </CardContent>
      </Card>
    </div>
  );
}
