"use client";

import { format, parseISO, subDays } from "date-fns";
import { TrendingUp } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface DailyUsagePoint {
  date: string; // "yyyy-MM-dd"
  chatCredits: number;
  imageCredits: number;
}

interface PerformanceOverviewProps {
  data: DailyUsagePoint[];
}

const chartConfig = {
  chatCredits: {
    label: "Chat",
    color: "var(--chart-1)",
  },
  imageCredits: {
    label: "Image Generation",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

/**
 * Fills in any missing dates within the last 14 days so the chart always
 * renders a continuous 14-day baseline (zero bars for days with no activity).
 */
function buildChartData(raw: DailyUsagePoint[]): DailyUsagePoint[] {
  const byDate = new Map(raw.map((p) => [p.date, p]));
  const today = new Date();

  return Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(today, 13 - i), "yyyy-MM-dd");
    return byDate.get(date) ?? { date, chatCredits: 0, imageCredits: 0 };
  });
}

export function PerformanceOverview({ data }: PerformanceOverviewProps) {
  const chartData = buildChartData(data);
  const totalCredits = chartData.reduce(
    (sum, d) => sum + d.chatCredits + d.imageCredits,
    0,
  );
  const hasActivity = totalCredits > 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">AI Usage &amp; Credit Activity</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Daily credit consumption over the last 14 days
          </span>
          <span className="@[540px]/card:hidden">Last 14 days</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        {hasActivity ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <ComposedChart data={chartData} margin={{ top: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  parseISO(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={32}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="w-48"
                    indicator="dot"
                    labelFormatter={(value) =>
                      format(parseISO(value), "d MMMM yyyy")
                    }
                  />
                }
              />
              <ChartLegend
                verticalAlign="top"
                content={<ChartLegendContent className="mb-4 justify-end" />}
              />
              <Bar
                dataKey="chatCredits"
                stackId="credits"
                fill="var(--color-chatCredits)"
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="imageCredits"
                stackId="credits"
                fill="var(--color-imageCredits)"
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          /* Empty state */
          <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">No activity yet</p>
              <p className="text-muted-foreground text-xs">
                Your credit usage will appear here once you start using AI features.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
