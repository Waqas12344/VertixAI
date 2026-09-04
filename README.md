# VertixAI

**The Unified Workspace for Conversational Intelligence & Generative Media**

VertixAI is a full-stack AI SaaS application that brings multi-turn streaming chat and text-to-image generation together in a single, credit-based workspace. Built on Next.js 16 App Router with Supabase for auth and storage, Prisma for data access, and Google's Gemini SDK for AI inference.

![Dashboard Preview](./media/dashboard.png)

---

## Features

- **Multi-turn AI Chat** — streaming conversations powered by `gemini-2.5-flash`, persisted per user with full history
- **Text-to-Image Studio** — prompt-based image generation stored in Supabase Storage with a downloadable gallery
- **Credit System** — atomic server-side deductions (Chat = 1 credit, Image = 5 credits) with refund support on failure
- **Free & Pro Plans** — 50 starter credits on sign-up; Pro unlocks 1,500 credits/month
- **Dynamic Dashboard** — live KPI cards, 14-day credit activity chart, and a paginated recent activity table
- **Secure Auth** — Supabase SSR with email/password, Google OAuth, and server-side `getUser()` validation in middleware
- **Billing Page** — plan comparison cards, one-time credit top-up packs, and a live credit progress meter

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui + Lucide React |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Database | Supabase PostgreSQL + Prisma ORM 7 (PrismaPg adapter) |
| Storage | Supabase Storage (`generated-images` bucket) |
| AI Engine | Google Gen AI SDK (`@google/genai` v2) — `gemini-2.5-flash` |
| Validation | Zod v4 + React Hook Form |
| Tables | TanStack Table v9 |
| Charts | Recharts v3 |
| Linting | Biome + lint-staged + Husky |

---

## Project Structure

```
src/
├── app/
│   ├── (external)/           # Public landing page
│   ├── (main)/
│   │   ├── auth/             # Login & register (v1 + v2 layouts)
│   │   ├── billing/          # Plans, top-up packs, credit summary
│   │   ├── chat/             # Multi-turn streaming chat UI
│   │   ├── dashboard/
│   │   │   ├── default/      # Main user dashboard (KPIs, chart, activity)
│   │   │   ├── analytics/    # Analytics section
│   │   │   └── profile/      # User profile & usage history
│   │   └── image-generator/  # Text-to-image studio
│   └── api/
│       ├── ai/chat/          # Streaming chat endpoint (auth + credit gate)
│       ├── ai/image/         # Image generation endpoint (auth + credit gate)
│       └── auth/             # Supabase auth callbacks & user sync
├── lib/
│   ├── prisma.ts             # Singleton PrismaClient (PrismaPg adapter)
│   ├── gemini.ts             # GoogleGenAI client
│   ├── credits.ts            # checkAndDeductCredits, refundCredits, getCreditBalance
│   └── supabase/
│       ├── server.ts         # SSR server client (cookies)
│       └── client.ts         # Browser client
├── components/ui/            # shadcn/ui primitives (do not modify directly)
└── middleware.ts             # Session-based route protection
prisma/
└── schema.prisma             # User, Conversation, Message, GeneratedImage, UsageLog
```

---

## Database Schema

```prisma
model User          { id, email, plan, credits, createdAt, ... }
model Conversation  { id, userId, title, createdAt, messages[] }
model Message       { id, conversationId, role, content, createdAt }
model GeneratedImage{ id, userId, prompt, imageUrl, createdAt }
model UsageLog      { id, userId, serviceType, creditsUsed, createdAt }
```

A database trigger on `auth.users` automatically provisions a `User` record with **50 free credits** on sign-up.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project with Auth and Storage enabled
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key

### 1. Clone and install

```bash
git clone https://github.com/your-username/vertix-ai.git
cd vertix-ai
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the root and fill in the values:

```env
# App
NEXT_PUBLIC_APP_NAME="VertixAI"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# Database (Supabase → Project Settings → Database)
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"

# Storage
NEXT_PUBLIC_STORAGE_BUCKET="generated-images"

# Google Gemini
GEMINI_API_KEY="<your-gemini-api-key>"
```

> `DATABASE_URL` uses the pgBouncer pooled connection (port 6543) for app queries.
> `DIRECT_URL` uses the direct connection (port 5432) for Prisma schema operations.

### 3. Push the database schema

```bash
npx prisma db push
npx prisma generate
```

### 4. Set up Supabase Storage

In your Supabase dashboard, create a public bucket named `generated-images`.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run Biome linter |
| `npm run format` | Format all files with Biome |
| `npm run check` | Run Biome lint + format check |
| `npm run check:fix` | Auto-fix Biome lint and format issues |

---

## Route Protection

All protected routes are guarded by `src/middleware.ts` using `getUser()` (server-validated JWT — never `getSession()`):

| Route | Access |
|---|---|
| `/dashboard/*` | Authenticated only |
| `/chat` | Authenticated only |
| `/image-generator` | Authenticated only |
| `/billing` | Authenticated only |
| `/auth/*` | Redirects to dashboard if already signed in |

---

## Credit System

Credits are deducted **atomically on the server** inside a Prisma `$transaction` before any AI call is made. If the downstream AI operation fails, credits are automatically refunded and the `UsageLog` entry is marked `REFUNDED`.

| Service | Cost |
|---|---|
| AI Chat (per message) | 1 credit |
| Image Generation | 5 credits |

| Plan | Starting Credits |
|---|---|
| Free | 50 (one-time on sign-up) |
| Pro | 1,500 / month |

---

## Key Coding Guardrails

- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `GEMINI_API_KEY` are **never** accessed in client components
- Raw image base64 data is **never** stored in PostgreSQL — only Supabase Storage public URLs
- AI endpoints are **never** called directly from client components
- shadcn/ui primitives in `src/components/ui/` are **not modified** directly
- All API request bodies are validated with **Zod** schemas

---

## License

[MIT](./LICENSE)
