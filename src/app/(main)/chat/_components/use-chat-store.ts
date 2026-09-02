"use client";

import { create } from "zustand";

import type { ChatMessage, ConversationSummary } from "./types";

// ---------------------------------------------------------------------------
// Global chat state managed by Zustand
// ---------------------------------------------------------------------------
type ChatStore = {
  // The active conversation id (null = new unsaved chat)
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Messages for the currently active conversation
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  // Append streaming text to the last model message
  appendStreamChunk: (chunk: string) => void;
  // Finalize the streaming message (clear the streaming flag)
  finalizeStream: () => void;

  // Whether a generation is currently in flight
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;

  // AbortController so the user can cancel mid-stream
  abortController: AbortController | null;
  setAbortController: (ac: AbortController | null) => void;

  // Sidebar conversation list (kept in sync after mutations)
  conversations: ConversationSummary[];
  setConversations: (c: ConversationSummary[]) => void;
  prependConversation: (c: ConversationSummary) => void;
  removeConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  messages: [],
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  appendStreamChunk: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== "model") return s;
      msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
      return { messages: msgs };
    }),
  finalizeStream: () =>
    set((s) => {
      const msgs = s.messages.map((m) =>
        m.streaming ? { ...m, streaming: false } : m,
      );
      return { messages: msgs };
    }),

  isStreaming: false,
  setIsStreaming: (v) => set({ isStreaming: v }),

  abortController: null,
  setAbortController: (ac) => set({ abortController: ac }),

  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  prependConversation: (c) =>
    set((s) => ({ conversations: [c, ...s.conversations] })),
  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
    })),
  renameConversation: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title } : c,
      ),
    })),
}));
