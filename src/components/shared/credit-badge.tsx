import Link from "next/link";

import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";

interface CreditBadgeProps {
  credits: number;
  className?: string;
}

/**
 * Pure presentational component — receives pre-fetched credits from layout.tsx.
 * Links to /billing. Turns red when balance drops to 5 or below.
 */
export function CreditBadge({ credits, className }: CreditBadgeProps) {
  return (
    <Link
      href="/billing"
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
        credits <= 5 && "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        className,
      )}
      title={`${credits} credits remaining — click to manage`}
    >
      <Coins className="size-3.5 shrink-0" aria-hidden />
      <span>{credits} credits</span>
    </Link>
  );
}
