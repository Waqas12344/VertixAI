"use client";

import { isToday, isYesterday, subDays } from "date-fns";
import {
  Check,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { ConversationSummary, DateGroup } from "./types";
import { useChatStore } from "./use-chat-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (date >= subDays(new Date(), 7)) return "Previous 7 Days";
  return "Older";
}

const GROUP_ORDER: DateGroup[] = [
  "Today",
  "Yesterday",
  "Previous 7 Days",
  "Older",
];

function groupConversations(
  conversations: ConversationSummary[],
): Array<{ group: DateGroup; items: ConversationSummary[] }> {
  const map = new Map<DateGroup, ConversationSummary[]>();
  for (const c of conversations) {
    const g = getDateGroup(c.updatedAt);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(c);
  }
  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
    group: g,
    items: map.get(g)!,
  }));
}

// ---------------------------------------------------------------------------
// Rename inline editor
// ---------------------------------------------------------------------------
function RenameInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <form
      className="flex flex-1 items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) onCommit(trimmed);
      }}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="h-6 flex-1 px-1.5 py-0 text-xs"
        autoFocus
      />
      <button
        type="submit"
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Confirm rename"
      >
        <Check className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Cancel rename"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Single conversation row
// ---------------------------------------------------------------------------
function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <SidebarMenuItem>
      <div className={cn("group/item relative flex w-full items-center gap-1")}>
        {renaming ? (
          <div className="flex flex-1 items-center gap-1 px-2 py-1">
            <RenameInput
              initialValue={conversation.title}
              onCommit={(title) => {
                onRename(title);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          </div>
        ) : (
          <>
            <SidebarMenuButton
              isActive={isActive}
              onClick={onSelect}
              className="flex-1 truncate text-left text-sm"
              tooltip={conversation.title}
            >
              <span className="truncate">{conversation.title}</span>
            </SidebarMenuButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 mr-0.5 size-6 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100"
                  aria-label="Conversation options"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onSelect={() => setRenaming(true)}>
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={onDelete}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </SidebarMenuItem>
  );
}

// ---------------------------------------------------------------------------
// ChatSidebar
// ---------------------------------------------------------------------------
export function ChatSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    setMessages,
    setConversations,
    removeConversation,
    renameConversation,
  } = useChatStore();

  // Load conversation list on mount
  useEffect(() => {
    fetch("/api/ai/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (data.conversations) setConversations(data.conversations);
      })
      .catch(() => {/* silently ignore network errors */});
  }, [setConversations]);

  function handleNewChat() {
    setActiveConversationId(null);
    setMessages([]);
  }

  async function handleSelect(id: string) {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    // Load messages for this conversation
    try {
      const res = await fetch(`/api/ai/messages?conversationId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      // Will show empty thread — user can still continue chatting
    }
  }

  async function handleDelete(id: string) {
    removeConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
    await fetch("/api/ai/conversations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function handleRename(id: string, title: string) {
    renameConversation(id, title);
    await fetch("/api/ai/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
  }

  const groups = groupConversations(conversations);

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]! **:data-[sidebar=sidebar]:bg-background"
    >
      <SidebarHeader className="border-b px-3 py-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
        >
          <MessageSquarePlus className="size-4 shrink-0" />
          {!isCollapsed && <span>New Chat</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          {groups.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-xs">
              No conversations yet.
              <br />
              Start a new chat above.
            </div>
          ) : (
            groups.map(({ group, items }) => (
              <SidebarGroup key={group}>
                <SidebarGroupLabel className="text-xs font-normal text-muted-foreground">
                  {group}
                </SidebarGroupLabel>
                <SidebarMenu className="gap-0.5">
                  {items.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => handleSelect(conv.id)}
                      onDelete={() => handleDelete(conv.id)}
                      onRename={(title) => handleRename(conv.id, title)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))
          )}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
