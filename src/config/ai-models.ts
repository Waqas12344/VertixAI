/**
 * Central registry of available chat models.
 *
 * - `id`          — exact model ID passed to the Gemini SDK
 * - `creditCost`  — credits deducted per request on the server
 * - `badge`       — short label shown in the UI
 *
 * Add new models here; the API route and UI pick them up automatically.
 */
export const CHAT_MODELS = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    description: "Fast and responsive for everyday tasks",
    creditCost: 1,
    badge: "Fast",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    description: "Deep reasoning and complex coding",
    creditCost: 3,
    badge: "Pro",
  },
] as const;

// Derived types — consumed by the store and the API route
export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];
export type ChatModel   = (typeof CHAT_MODELS)[number];

/** Look up a model by id. Returns undefined for unknown ids. */
export function findModel(id: string): ChatModel | undefined {
  return CHAT_MODELS.find((m) => m.id === id) as ChatModel | undefined;
}

/** The default model used when no preference has been selected. */
export const DEFAULT_MODEL_ID: ChatModelId = CHAT_MODELS[0].id;
