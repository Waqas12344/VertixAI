import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";

interface SidebarCreditBadgeProps {
  credits: number;
}

/**
 * Pure presentational component for the sidebar footer.
 * Collapses to icon-only when the sidebar is in icon mode.
 * Receives pre-fetched credits from layout.tsx — no extra DB call.
 */
export function SidebarCreditBadge({ credits }: SidebarCreditBadgeProps) {
  return (
    <div
      className={cn(
        "mx-2 mb-1 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium",
        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
        credits <= 5 && "border-destructive/40 bg-destructive/10 text-destructive",
      )}
      title={`${credits} credits remaining`}
    >
      <Coins className="size-4 shrink-0" aria-hidden />
      <span className="group-data-[collapsible=icon]:hidden">
        <span className="tabular-nums">{credits}</span> credits
      </span>
    </div>
  );
}
