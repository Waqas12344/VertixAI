import { format, subDays } from "date-fns";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview } from "./_components/performance-overview";
import type { DailyUsagePoint } from "./_components/performance-overview";
import { QuickActions } from "./_components/quick-actions";
import { RecentActivityOverview } from "./_components/recent-activity-overview";
import type { ActivityRow } from "./_components/activity-table/schema";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getDashboardData(userId: string) {
  const fourteenDaysAgo = subDays(new Date(), 14);

  const [user, conversationCount, imageCount, recentLogs, aggregatedUsage] =
    await Promise.all([
      // 1. User credits + plan
      prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, plan: true },
      }),

      // 2. Total conversation count
      prisma.conversation.count({
        where: { userId },
      }),

      // 3. Total generated images count
      prisma.generatedImage.count({
        where: { userId },
      }),

      // 4. Recent usage logs (last 10, newest first)
      prisma.usageLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          serviceType: true,
          creditsUsed: true,
          createdAt: true,
        },
      }),

      // 5. 14-day aggregated credit consumption grouped by date
      prisma.usageLog.findMany({
        where: {
          userId,
          createdAt: { gte: fourteenDaysAgo },
        },
        select: {
          serviceType: true,
          creditsUsed: true,
          createdAt: true,
        },
      }),
    ]);

  // ---- Shape activity rows ------------------------------------------------
  const activityRows: ActivityRow[] = recentLogs.map((log) => ({
    id: log.id,
    serviceType: log.serviceType,
    details: serviceDetails(log.serviceType),
    creditsUsed: log.creditsUsed,
    createdAt: log.createdAt.toISOString(),
    status: "Completed",
  }));

  // ---- Aggregate daily chart data ----------------------------------------
  const dailyMap = new Map<string, { chatCredits: number; imageCredits: number }>();

  for (const log of aggregatedUsage) {
    const day = format(log.createdAt, "yyyy-MM-dd");
    const existing = dailyMap.get(day) ?? { chatCredits: 0, imageCredits: 0 };

    if (log.serviceType === "IMAGE") {
      existing.imageCredits += log.creditsUsed;
    } else {
      // CHAT, PDF, or any other service type counts as chat
      existing.chatCredits += log.creditsUsed;
    }

    dailyMap.set(day, existing);
  }

  const chartData: DailyUsagePoint[] = Array.from(dailyMap.entries()).map(
    ([date, values]) => ({ date, ...values }),
  );

  return {
    credits: user?.credits ?? 0,
    plan: user?.plan ?? "FREE",
    conversationCount,
    imageCount,
    activityRows,
    chartData,
  };
}

/** Returns a human-readable details string for a service type. */
function serviceDetails(serviceType: string): string {
  switch (serviceType) {
    case "CHAT":
      return "AI chat message sent";
    case "IMAGE":
      return "Image generated via AI Studio";
    case "REFUNDED":
      return "Credit refund applied";
    default:
      return serviceType;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/v2/login");
  }

  const { credits, plan, conversationCount, imageCount, activityRows, chartData } =
    await getDashboardData(user.id);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* KPI cards */}
      <MetricCards
        credits={credits}
        plan={plan}
        conversationCount={conversationCount}
        imageCount={imageCount}
      />

      {/* Quick action shortcuts */}
      <QuickActions />

      {/* AI usage chart */}
      <PerformanceOverview data={chartData} />

      {/* Recent activity table */}
      <RecentActivityOverview data={activityRows} />
    </div>
  );
}
