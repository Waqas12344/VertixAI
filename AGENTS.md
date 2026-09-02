# AGENTS.md - VertixAI (Multi-Service AI SaaS)

## 1. Project Identity & Overview
- **Product Name**: VertixAI
- **Tagline**: The Unified Workspace for Conversational Intelligence & Generative Media
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Infrastructure**: Supabase (Auth, PostgreSQL, Storage) + Google Gen AI SDK (`@google/genai`)
- **IDE & Tooling**: Kiro IDE with Supabase MCP Server enabled

---

## 2. Core Operational Principles for AI Agents

1. **Strict Phased Progression**: Complete and verify each phase fully before generating code for subsequent phases.
2. **Colocation File Structure**: Every distinct feature lives in its own route group (`src/app/(main)/<feature>/`) with components colocated inside `_components/`.
3. **No Breaking Modifications**: Do NOT modify primitive components inside `src/components/ui/` unless explicitly requested.
4. **Zero Client-Side Secrets**: Never access `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `GEMINI_API_KEY` inside client components (`'use client'`).
5. **Credit-Protected API Routes**: Every AI endpoint must authenticate the user, verify credit balance, and execute a database deduction before calling the Gemini SDK.

---

## 3. Tech Stack & Environment Specifications

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui + Lucide React
- **Authentication**: `@supabase/ssr` + `@supabase/supabase-js`
- **Database & ORM**: Supabase PostgreSQL + Prisma ORM
- **Object Storage**: Supabase Storage (Bucket: `generated-images`)
- **AI Engine**: `@google/genai` (Official Google Gen AI SDK)
- **Validation**: Zod + React Hook Form

---

## 4. Phased Step-by-Step Implementation Roadmap

### ✅ PHASE 1: Environment & Database Architecture (COMPLETED)
- [x] Defined models in `prisma/schema.prisma` (`User`, `Conversation`, `Message`, `GeneratedImage`, `UsageLog`).
- [x] Configured `prisma.config.ts` for direct/pooled connections.
- [x] Executed `npx prisma db push` and generated client.

### ✅ PHASE 2: Complete Authentication & Route Security (COMPLETED)
- [x] Configured Supabase SSR clients (`client.ts`, `server.ts`).
- [x] Built strict session verification in `src/middleware.ts` for protected routes (`/dashboard`, `/chat`, `/image-generator`, `/billing`).
- [x] Connected login, register, and Google OAuth flows.
- [x] Created database trigger on `auth.users` to provision `User` records with **50 free starting credits**.

### ✅ PHASE 3: Core SaaS Layout & Navigation (COMPLETED)
- [x] Pruned unused template screens from `src/app/(main)/dashboard/`.
- [x] Updated sidebar navigation with clean routes.
- [x] Added dynamic user profile and credit meter components.

---

### ⏳ PHASE 3.5: User Profile & Billing System (CURRENT FOCUS)
**Goal**: Build dynamic profile management and billing/credit replenishment infrastructure.

- [ ] **User Profile Page (`src/app/(main)/dashboard/profile/page.tsx`)**:
  - Fetch real user data from Supabase Auth & Prisma `User`.
  - Display: User Name, Email, Plan Badge (`FREE` / `PRO`), Account Creation Date, and Live Available Credits.
  - Enable display name / avatar updates.
  - Display usage history log (Recent operations from the `UsageLog` table).

- [ ] **Billing & Plans Page (`src/app/(main)/billing/page.tsx`)**:
  - `_components/pricing-cards.tsx`:
    - **Starter / Free Plan**: 50 credits (default on signup), standard model access.
    - **Pro Plan**: 1,500 credits/mo, priority image generation, fast responses.
    - **Credit Top-up Packs**: Purchase one-time packs (e.g., 500 credits for custom top-up).
  - `_components/credit-summary-card.tsx`:
    - Live remaining balance progress bar.
    - Cost breakdown sheet: Chat = 1 credit, Image = 5 credits.
  - Prepare payment gateway checkout hooks (Safepay / Lemon Squeezy integration point).

---

### 💬 PHASE 4: AI Service 1 — Multi-Turn Streaming Chatbot
**Goal**: Build a streaming AI chat interface powered by Gemini.

- [ ] Initialize Gemini SDK client in `src/lib/gemini.ts` using `@google/genai`.
- [ ] Create Streaming API Route (`src/app/api/ai/chat/route.ts`):
  - Authenticate session, check & deduct **1 credit** via `checkAndDeductCredits`.
  - Stream tokens using `ai.models.generateContentStream` with `gemini-2.5-flash`.
  - Save prompt and model response to `Conversation` & `Message` models in PostgreSQL.
- [ ] Refactor Chat UI (`src/app/(main)/chat/`):
  - Conversation thread with Markdown and code syntax highlighting.
  - Chat history sidebar fetching previous conversations.
  - Insufficient credit gate modal routing to `/billing`.

---

### 🎨 PHASE 5: AI Service 2 — Text-to-Image Studio
**Goal**: Build a prompt-based image generation tool with Supabase Storage.

- [ ] Create Image API Route (`src/app/api/ai/image/route.ts`):
  - Authenticate session, check & deduct **5 credits**.
  - Generate image buffer using `gemini-2.5-flash-image`.
  - Upload image directly to Supabase Storage (`generated-images` bucket).
  - Record public image URL in Prisma `GeneratedImage`.
- [ ] Build Image Studio UI (`src/app/(main)/image-generator/`):
  - `_components/prompt-bar.tsx`: Prompt bar, aspect ratio selector, generate button.
  - `_components/image-gallery.tsx`: Responsive grid showing previous user images with single-click download.

---

## 5. Coding Standards & Guardrails

- **Validation**: All incoming API requests must be validated using **Zod** schemas.
- **Credit Protection**: Always deduct credits on the server side using atomic Prisma transactions (`$transaction`).
- **Dependencies**: Use only `@google/genai` (Never use deprecated `@google/generative-ai` or `langchain`).
- ❌ Do NOT store raw image base64 strings directly in the PostgreSQL database.
- ❌ Do NOT call AI endpoints directly from client components.
- ❌ Do NOT touch primitive components in `src/components/ui/`.