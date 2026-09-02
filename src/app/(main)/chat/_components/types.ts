// ---------------------------------------------------------------------------
// Shared types for the AI chatbot UI
// These replace the old CRM-typed data.ts structures.
// ---------------------------------------------------------------------------

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  messages: { role: string; content: string }[];
};

export type ChatMessage = {
  id: string; // local uuid for optimistic rendering
  role: "user" | "model";
  content: string;
  createdAt: string; // ISO string
  streaming?: boolean; // true while the assistant is still typing
};

export type DateGroup = "Today" | "Yesterday" | "Previous 7 Days" | "Older";
