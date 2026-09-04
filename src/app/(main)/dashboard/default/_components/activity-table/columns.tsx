"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Bot, CheckCircle2, ImageIcon, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/lib/data-table-features";

import type { ActivityRow } from "./schema";

function ServiceIcon({ type }: { type: string }) {
  if (type === "IMAGE") return <ImageIcon className="size-4 text-purple-500" />;
  if (type === "REFUNDED") return <RotateCcw className="size-4 text-muted-foreground" />;
  // CHAT or any other variant
  return <Bot className="size-4 text-blue-500" />;
}

function serviceLabel(type: string): string {
  switch (type) {
    case "CHAT":
      return "Chatbot — Gemini Flash";
    case "IMAGE":
      return "Image Generation";
    case "REFUNDED":
      return "Refunded";
    default:
      return type;
  }
}

function serviceBadgeVariant(
  type: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "IMAGE":
      return "secondary";
    case "REFUNDED":
      return "outline";
    default:
      return "default";
  }
}

export const activityColumns: ColumnDef<DataTableFeatures, ActivityRow>[] = [
  {
    accessorKey: "serviceType",
    header: "Service",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <ServiceIcon type={row.original.serviceType} />
        <Badge variant={serviceBadgeVariant(row.original.serviceType)} className="text-xs">
          {serviceLabel(row.original.serviceType)}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => (
      <span className="block max-w-xs truncate text-muted-foreground text-sm">
        {row.original.details || "—"}
      </span>
    ),
  },
  {
    accessorKey: "creditsUsed",
    header: "Credits",
    cell: ({ row }) => {
      const { creditsUsed, serviceType } = row.original;
      const isRefund = serviceType === "REFUNDED";
      return (
        <span
          className={
            isRefund
              ? "font-medium text-emerald-600 text-sm dark:text-emerald-400"
              : "font-medium text-sm text-destructive"
          }
        >
          {isRefund ? `+${creditsUsed}` : `-${creditsUsed}`}
          {creditsUsed === 1 ? " credit" : " credits"}
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date & Time",
    cell: ({ row }) => {
      const date = parseISO(row.original.createdAt);
      return (
        <div className="grid gap-0.5">
          <span className="text-sm">{format(date, "do MMM yyyy")}</span>
          <span className="text-muted-foreground text-xs">{format(date, "h:mm a")}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1.5 px-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3 fill-emerald-500 stroke-background dark:fill-emerald-400" />
        {row.original.status}
      </Badge>
    ),
  },
];
