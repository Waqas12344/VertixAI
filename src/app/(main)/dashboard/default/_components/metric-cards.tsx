import { Bot, Coins, ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardsProps {
  credits: number;
  plan: string;
  conversationCount: number;
  imageCount: number;
}

export function MetricCards({ credits, plan, conversationCount, imageCount }: MetricCardsProps) {
  const isLow = credits <= 5;
  const isPro = plan === "PRO";

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {/* Card 1: Available Credits */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Coins className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Available Credits</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                "font-medium text-3xl tabular-nums leading-none tracking-tight",
                isLow && "text-destructive",
              )}
            >
              {credits.toLocaleString()}
            </div>
            {isLow && (
              <Badge variant="destructive" className="text-xs">
                Low
              </Badge>
            )}
          </div>
          <Link
            href="/billing"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            Top Up Credits →
          </Link>
        </CardContent>
      </Card>

      {/* Card 2: Total Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Bot className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Conversations</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {conversationCount.toLocaleString()}
          </div>
          <Link
            href="/chat"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            Launch Chat →
          </Link>
        </CardContent>
      </Card>

      {/* Card 3: Studio Images */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <ImageIcon className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Studio Images</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {imageCount.toLocaleString()}
            </div>
            {imageCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                Ready
              </Badge>
            )}
          </div>
          <Link
            href="/image-generator"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            Open Studio →
          </Link>
        </CardContent>
      </Card>

      {/* Card 4: Membership Plan */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Sparkles className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Membership Plan</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {plan}
            </div>
            <Badge
              className={cn(
                "text-xs",
                isPro
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isPro ? "Active" : "Free Tier"}
            </Badge>
          </div>
          {!isPro && (
            <Button asChild size="sm" variant="outline" className="mt-1 w-fit">
              <Link href="/billing">Upgrade to Pro</Link>
            </Button>
          )}
          {isPro && (
            <p className="text-muted-foreground text-sm">1,500 credits / month</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
