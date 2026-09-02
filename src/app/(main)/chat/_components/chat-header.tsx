"use client";

import { ArrowLeft, MessageSquarePlus, PanelLeftOpen, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { CreditBadge } from "@/components/shared/credit-badge";

import { useChatStore } from "./use-chat-store";

interface ChatHeaderProps {
  credits: number;
}

export function ChatHeader({ credits }: ChatHeaderProps) {
  const { state, toggleSidebar } = useSidebar();
  const isSidebarOpen = state === "expanded";

  const { setActiveConversationId, setMessages } = useChatStore();

  function handleNewChat() {
    setActiveConversationId(null);
    setMessages([]);
  }

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) w-full items-center border-b bg-background">
      <div className="flex h-full w-full items-center justify-between gap-2 px-4">

        {/* ── Left cluster ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          {/* Back to main dashboard */}
          <Button variant="ghost" size="icon-sm" asChild aria-label="Back to dashboard">
            <Link href="/dashboard/default">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          {/* Open-sidebar button — only visible when sidebar is collapsed */}
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          )}

          <Separator orientation="vertical" className="mx-1 h-4" />

          {/* Brand */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <span className="font-semibold text-sm">VertixAI Chat</span>
          </div>
        </div>

        {/* ── Right cluster ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <CreditBadge credits={credits} />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewChat}
            aria-label="New conversation"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>

      </div>
    </header>
  );
}
