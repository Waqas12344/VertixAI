import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ActivityTable } from "./activity-table/table";
import type { ActivityRow } from "./activity-table/schema";

interface RecentActivityOverviewProps {
  data: ActivityRow[];
}

export function RecentActivityOverview({ data }: RecentActivityOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">Recent Generations &amp; Activity</CardTitle>
        <CardDescription>
          Your last {data.length > 0 ? `${data.length} ` : ""}AI operations — chats, images, and credit events.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <ActivityTable data={data} />
      </CardContent>
    </Card>
  );
}
