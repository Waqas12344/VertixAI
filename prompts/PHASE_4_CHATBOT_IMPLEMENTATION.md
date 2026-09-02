# Phase 4 — Multi-Turn Streaming AI Chatbot Implementation

**Stack**: Next.js 16 App Router · Gemini 3.6 Flash (`@google/genai`) · Prisma/PostgreSQL · Supabase Auth · Zustand · react-markdown

---

## 1. New & Modified Files

### New files created

| Path | Purpose |
|------|---------|
| `src/lib/gemini.ts` | Initialises the `GoogleGenAI` SDK singleton from `GEMINI_API_KEY` |
| `src/app/api/ai/chat/route.ts` | Streaming POST endpoint — auth, credit deduction, Gemini call, DB persist |
| `src/app/api/ai/conversations/route.ts` | GET (list), DELETE, PATCH (rename) for conversation management |
| `src/app/api/ai/messages/route.ts` | GET messages for a single conversation (used when switching convs) |
| `src/app/(main)/chat/_components/types.ts` | Shared TypeScript types: `ConversationSummary`, `ChatMessage`, `DateGroup` |
| `src/app/(main)/chat/_components/use-chat-store.ts` | Zustand store for all real-time chat state |
| `prompts/PHASE_4_CHATBOT_IMPLEMENTATION.md` | This document |

### Modified files

| Path | What changed |
|------|-------------|
| `src/app/(main)/chat/page.tsx` | Server component — fetches credits from Prisma, passes to `ChatThread` |
| `src/app/(main)/chat/layout.tsx` | Simplified — `SidebarProvider` + `ChatHeader` + `ChatSidebar` + `{children}` |
| `src/app/(main)/chat/_components/chat-header.tsx` | Rewritten — AI branding, sidebar toggle, New Chat shortcut |
| `src/app/(main)/chat/_components/chat-sidebar.tsx` | Fully rewritten — history list grouped by date, inline rename, delete |
| `src/app/(main)/chat/_components/chat-thread.tsx` | Fully rewritten — message canvas, streaming, Markdown, composer |

### Deleted files (CRM inbox template — no longer needed)

- `src/app/(main)/chat/_components/data.ts`
- `src/app/(main)/chat/_components/use-chat.ts`
- `src/app/(main)/chat/_components/chat.tsx`
- `src/app/(main)/chat/_components/chat-conversation-list.tsx`
- `src/app/(main)/chat/_components/chat-profile-details.tsx`

---

## 2. Multi-Turn Context Reconstruction

Gemini's `generateContentStream` expects a `contents` array of alternating `user` / `model` turns. The route handler reconstructs this from the database on every request.

```
POST /api/ai/chat  ←  { prompt, conversationId? }

  1. Load all past Messages for this conversationId (ordered by createdAt ASC)
  2. Map each row → { role: "user" | "model", parts: [{ text: content }] }
  3. Append the new user prompt as the final entry
  4. Pass the full array to ai.models.generateContentStream({ model: "gemini-3.6-flash", contents })
```

Example `contents` array sent to Gemini for a two-turn conversation:

```json
[
  { "role": "user",  "parts": [{ "text": "What is a monad?" }] },
  { "role": "model", "parts": [{ "text": "A monad is a design pattern…" }] },
  { "role": "user",  "parts": [{ "text": "Give me a TypeScript example." }] }
]
```

Gemini receives the full history so it can reference prior context in its reply. There is no token-budget management in Phase 4 — every stored message is included. For very long conversations this can be trimmed in a future phase.

---

## 3. Token Streaming & Database Persistence

### Streaming pipeline

```
Browser                          Next.js Route Handler               Gemini API
  │                                      │                               │
  │── POST /api/ai/chat ──────────────►  │── generateContentStream ────► │
  │                                      │ ◄──── chunk 1 ────────────── │
  │ ◄──── raw text chunk 1 ─────────── │ ◄──── chunk 2 ────────────── │
  │ ◄──── raw text chunk 2 ─────────── │          ...                  │
  │          ...                         │ ◄──── [done] ─────────────── │
  │                                      │                               │
  │                               prisma.message.createMany()
  │                               (user prompt + full assistant reply)
  │                               prisma.conversation.update({ updatedAt })
```

**Route handler** (`src/app/api/ai/chat/route.ts`):
- Opens a `ReadableStream` and yields each chunk from the Gemini async iterator directly to the HTTP response body (`Content-Type: text/plain`).
- Accumulates chunks in `fullAssistantResponse` while streaming.
- After the iterator is exhausted, calls `prisma.message.createMany` to write both the user prompt and the complete model reply in a single batch.
- The `X-Conversation-Id` response header carries the ID so the client knows which conversation was created/used, without a second round-trip.

**Client** (`ChatThread.sendMessage`):
1. Appends an optimistic user bubble immediately.
2. Appends an empty model bubble with `streaming: true` to show the cursor.
3. Reads the response body with `ReadableStream.getReader()`.
4. Each `read()` chunk is passed to `appendStreamChunk` in the Zustand store, which appends to the last message's `content` string in-place — React re-renders only that message bubble.
5. On stream end, `finalizeStream()` clears the `streaming` flag (removes the blinking cursor).

### Credit deduction

Credit deduction happens **before** the Gemini call inside an atomic Prisma `$transaction`:

```
tx.user.findUnique  →  check credits >= 1
tx.user.update      →  decrement credits by 1
tx.usageLog.create  →  record { serviceType: "CHAT", creditsUsed: 1 }
```

If the balance is 0 the transaction throws `InsufficientCreditsError` and the route returns HTTP 402 before Gemini is ever called. The client catches this and injects an in-thread error message pointing the user to `/billing`.

---

## 4. Manual Testing Steps

### Prerequisites

1. `.env.local` must contain:
   ```
   GEMINI_API_KEY=your_key_here
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   DIRECT_URL=...   # or DATABASE_URL
   ```
2. `npx prisma db push` has been run and the `Conversation`, `Message`, `UsageLog` tables exist.
3. Run the dev server: `npm run dev`

### Test cases

#### A. Basic streaming message

1. Navigate to `/chat` while authenticated.
2. The empty state should show the greeting and four suggested prompt chips.
3. Click a suggested prompt — the user bubble appears instantly, then the assistant response streams in word-by-word with a blinking cursor.
4. After streaming completes the cursor disappears.
5. Verify in Supabase / Prisma Studio that a new `Conversation` and two `Message` rows (`role=user`, `role=model`) were created.
6. Verify `UsageLog` has a `CHAT` entry and the user's `credits` column was decremented by 1.

#### B. Multi-turn context

1. Start a new chat and ask: *"My name is Alex."*
2. In the same conversation ask: *"What is my name?"*
3. Gemini should reply with "Alex" — confirming prior context was passed.

#### C. Conversation history sidebar

1. Send at least one message to create a conversation.
2. Refresh the page — the sidebar should reload and show the conversation under "Today".
3. Hover a conversation row — the `⋯` button appears.
4. Click **Rename**, type a new title, press Enter — the sidebar updates instantly.
5. Click **Delete** — the conversation disappears from the sidebar and the thread clears.

#### D. Switching conversations

1. Create two separate conversations (use **New Chat** button between them).
2. Click the older conversation in the sidebar — the thread should load its stored messages.
3. Send a new message — it appends correctly and streams.

#### E. Abort mid-stream

1. Send a prompt that generates a long answer (e.g. "Write a 500 word essay on…").
2. While streaming, click the red **Stop** (square) button.
3. The stream stops. The partial response remains in the thread.
4. The input bar becomes active again immediately.
5. Verify in the DB that the partial response **was not** persisted (persistence only happens on clean stream completion).

#### F. Zero credits gate

1. Manually set `credits = 0` for the test user in Supabase / Prisma Studio.
2. Reload `/chat` — a red alert banner appears above the composer: *"You have 0 credits remaining."*
3. The input and send button are disabled.
4. Clicking **Top up to continue chatting** navigates to `/billing`.
5. Alternatively, submit via the API directly — the route should return `HTTP 402` with `{ "error": "insufficient_credits" }`.

#### F. TypeScript compilation

```bash
npx tsc --noEmit
# Expected: no output, exit code 0
```
