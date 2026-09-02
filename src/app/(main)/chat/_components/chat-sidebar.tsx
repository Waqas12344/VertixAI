"use client";

import { isToday, isYesterday, subDays } from "date-fns";
import {
  Check,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeftClose,
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

const GROUP_ORDER: DateGroup[] = ["Today", "Yesterday", "Previous 7 Days", "Older"];

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
      className="flex flex-1 items-center gap-1 px-1"
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
//
// Key constraint: DropdownMenuTrigger renders a <button>. SidebarMenuButton
// also renders a <button>. Nesting them causes a hydration error.
// Solution: use a plain <div> row with a plain <button> for the title and
// the DropdownMenuTrigger as a separate sibling — never nested.
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

  if (renaming) {
    return (
      <SidebarMenuItem>
        <RenameInput
          initialValue={conversation.title}
          onCommit={(title) => {
            onRename(title);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <div className="group/item flex w-full items-center gap-0 rounded-md px-1 hover:bg-sidebar-accent">

        {/* Title — plain <button>, never contains another button */}
        <button
          type="button"
          onClick={onSelect}
          title={conversation.title}
          className={cn(
            "min-w-0 max-w-50 flex-1 truncate rounded-md py-1.5 pl-2 pr-1 text-left text-xs",
            "text-sidebar-foreground transition-colors",
            "hover:text-sidebar-accent-foreground",
            isActive && "font-medium text-sidebar-accent-foreground",
          )}
        >
          {conversation.title}
        </button>

        {/* ⋯ options — sibling div, dropdown trigger is NOT inside the title button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 shrink-0 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100"
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
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </SidebarMenuItem>
  );
}

// ---------------------------------------------------------------------------
// ChatSidebar
// ---------------------------------------------------------------------------
export function ChatSidebar() {
  const { toggleSidebar } = useSidebar();

  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    setMessages,
    setConversations,
    removeConversation,
    renameConversation,
  } = useChatStore();

  useEffect(() => {
    fetch("/api/ai/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (data.conversations) setConversations(data.conversations);
      })
      .catch(() => {/* silently ignore */});
  }, [setConversations]);

  function handleNewChat() {
    setActiveConversationId(null);
    setMessages([]);
  }

  async function handleSelect(id: string) {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    try {
      const res = await fetch(`/api/ai/messages?conversationId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      // empty thread is fine
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
      {/* Header: close toggle + New Chat */}
      <SidebarHeader className="border-b px-2 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
            className="shrink-0"
          >
            <PanelLeftClose className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 font-normal"
            onClick={handleNewChat}
          >
            <MessageSquarePlus className="size-4 shrink-0" />
            <span className="truncate">New Chat</span>
          </Button>
        </div>
      </SidebarHeader>

      {/* Conversation history */}
      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
          {groups.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground text-xs leading-5">
              No conversations yet.
              <br />
              Start a new chat above.
            </div>
          ) : (
            groups.map(({ group, items }) => (
              <SidebarGroup key={group} className="py-1">
                <SidebarGroupLabel className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group}
                </SidebarGroupLabel>
                <SidebarMenu className="gap-0">
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
