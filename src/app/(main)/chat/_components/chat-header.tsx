"use client";

import { MessageSquarePlus, PanelLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

import { useChatStore } from "./use-chat-store";

export function ChatHeader() {
  const { toggleSidebar } = useSidebar();
  const { setActiveConversationId, setMessages } = useChatStore();

  function handleNewChat() {
    setActiveConversationId(null);
    setMessages([]);
  }

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) w-full items-center border-b bg-background">
      <div className="flex h-full w-full items-center justify-between gap-3 px-4">
        {/* Left: sidebar toggle + brand */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="Toggle chat history sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <span className="font-semibold text-sm">VertixAI Chat</span>
          </div>
        </div>

        {/* Right: new chat button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNewChat}
          aria-label="New conversation"
        >
          <MessageSquarePlus className="size-4" />
        </Button>
      </div>
    </header>
  );
}
