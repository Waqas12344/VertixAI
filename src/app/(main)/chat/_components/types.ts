// ---------------------------------------------------------------------------
// Shared types for the AI chatbot UI
// ---------------------------------------------------------------------------

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  messages: { role: string; content: string }[];
};

/** A single image attached to a user message — base64 encoded, ready for Gemini. */
export type AttachedImage = {
  /** Stable local id for React keys / removal. */
  id: string;
  /** Raw base64 string WITHOUT the data-URL prefix. */
  data: string;
  /** MIME type — "image/png" | "image/jpeg" | "image/webp" */
  mimeType: string;
  /** data-URL used only for the <img> preview thumbnail. */
  previewUrl: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "model";
  content: string;
  createdAt: string; // ISO string
  streaming?: boolean;
  /** Images attached to a user message — stored for in-bubble display. */
  images?: AttachedImage[];
};

export type DateGroup = "Today" | "Yesterday" | "Previous 7 Days" | "Older";
