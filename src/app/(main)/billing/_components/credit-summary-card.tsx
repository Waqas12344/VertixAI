import { Bot, Coins, ImageIcon, Info, Zap } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PLAN_MAX: Record<string, number> = {
  FREE: 50,
  PRO: 1500,
};

const SERVICE_COSTS = [
  {
    icon: <Bot className="size-4 text-blue-500" />,
    label: "AI Chat",
    cost: 1,
    description: "Per conversation message sent",
  },
  {
    icon: <ImageIcon className="size-4 text-purple-500" />,
    label: "Image Generation",
    cost: 5,
    description: "Per image generated",
  },
];

interface CreditSummaryCardProps {
  credits: number;
  plan: string;
  chatCreditsUsed: number;
  imageCreditsUsed: number;
}

export function CreditSummaryCard({
  credits,
  plan,
  chatCreditsUsed,
  imageCreditsUsed,
}: CreditSummaryCardProps) {
  const maxCredits = PLAN_MAX[plan] ?? 50;
  const totalUsed = chatCreditsUsed + imageCreditsUsed;
  const pct = Math.min(100, Math.round((credits / maxCredits) * 100));
  const isLow = credits <= 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Credit Balance</CardTitle>
            <CardDescription>Your current usage and remaining allowance</CardDescription>
          </div>
          <Badge
            variant={plan === "PRO" ? "default" : "secondary"}
            className={cn(
              "shrink-0",
              plan === "PRO" &&
                "bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
            )}
          >
            {plan} Plan
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Balance meter */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "font-bold text-4xl tabular-nums leading-none",
                  isLow && "text-destructive",
                )}
              >
                {credits}
              </span>
              <span className="text-muted-foreground text-sm">/ {maxCredits} credits</span>
            </div>
            <span
              className={cn(
                "text-sm tabular-nums font-medium",
                isLow ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {pct}% remaining
            </span>
          </div>
          <Progress
            value={pct}
            className={cn("h-2", isLow && "[&>div]:bg-destructive")}
          />
          {isLow && (
            <p className="flex items-center gap-1.5 text-destructive text-xs">
              <Zap className="size-3.5" />
              Running low — top up to keep using AI features.
            </p>
          )}
        </div>

        <Separator />

        {/* Usage breakdown */}
        <div>
          <h3 className="mb-3 font-medium text-sm">Usage Breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-blue-500" />
                <span className="text-sm">Chat credits used</span>
              </div>
              <span className="font-medium tabular-nums text-sm">{chatCreditsUsed}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-purple-500" />
                <span className="text-sm">Image credits used</span>
              </div>
              <span className="font-medium tabular-nums text-sm">{imageCreditsUsed}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Service cost reference */}
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 font-medium text-sm">
            Service Costs
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Credits are deducted per request</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICE_COSTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5"
              >
                {s.icon}
                <div className="flex-1">
                  <p className="font-medium text-sm leading-none">{s.label}</p>
                  <p className="mt-0.5 text-muted-foreground text-xs">{s.description}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Coins className="size-3 text-muted-foreground" />
                  <span className="font-semibold tabular-nums text-sm">{s.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
