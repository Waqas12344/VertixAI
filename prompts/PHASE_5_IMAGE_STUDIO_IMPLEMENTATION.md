# Phase 5: Generative AI Image Studio — Implementation Reference

## Overview

Phase 5 adds a full text-to-image generation feature powered by **Google Imagen 3** (`imagen-3.0-generate-002`), **Supabase Storage**, and **Prisma ORM**. Users spend 5 credits per image. Generated images are stored in Supabase Storage and their metadata is persisted in PostgreSQL. Credits are deducted atomically and refunded automatically on any failure.

---

## File Tree

```
src/
├── lib/
│   └── storage.ts                         # Supabase Storage upload utility (server-only)
│
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── image/
│   │           └── route.ts               # POST / GET / DELETE API handlers
│   │
│   └── (main)/
│       └── image-generator/
│           ├── layout.tsx                 # Server layout — sidebar + header + credit badge
│           ├── page.tsx                   # Server page — auth guard, data fetch, passes props
│           └── _components/
│               ├── image-store.ts         # Zustand store — images, credits, generating state
│               ├── prompt-bar.tsx         # Control bar — prompt, aspect ratio, generate, credits
│               ├── image-gallery.tsx      # Responsive grid — cards with overlay actions
│               └── image-studio.tsx       # Root client wrapper — hydrates store, composes UI
│
next.config.mjs                            # Added Supabase Storage remotePatterns
```

---

## API Contracts

### `POST /api/ai/image` — Generate Image

**Request body (JSON):**
```json
{
  "prompt": "string (1–2000 chars, required)",
  "aspectRatio": "1:1 | 16:9 | 9:16 | 4:3 | 3:4 (optional, default: 1:1)"
}
```

**Success response `201`:**
```json
{
  "success": true,
  "image": {
    "id": "uuid",
    "prompt": "original prompt string",
    "imageUrl": "https://kqpjwckfwnsaqfqgnzfo.supabase.co/storage/v1/object/public/generated-images/<userId>/<uuid>.jpg",
    "createdAt": "2026-09-05T00:00:00.000Z"
  },
  "remainingCredits": 45
}
```

**Error responses:**
| Status | `error` key           | Meaning                                          |
|--------|-----------------------|--------------------------------------------------|
| 401    | `"Unauthorized"`      | No valid session cookie                          |
| 400    | `"Invalid JSON body"` | Malformed request body                           |
| 422    | `"Validation failed"` | Zod schema violation (details included)          |
| 402    | `"insufficient_credits"` | User has < 5 credits (no deduction made)      |
| 500    | `"generation_failed"` | Imagen API error — credits automatically refunded |
| 500    | `"storage_failed"`    | Supabase Storage error — credits automatically refunded |

---

### `GET /api/ai/image` — Fetch Image History

**Auth:** Session cookie required.

**Success response `200`:**
```json
{
  "images": [
    {
      "id": "uuid",
      "prompt": "string",
      "imageUrl": "https://...",
      "createdAt": "ISO string"
    }
  ]
}
```
Ordered by `createdAt DESC`. Returns `[]` if none exist.

---

### `DELETE /api/ai/image?id=<uuid>` — Delete Image

**Auth:** Session cookie required. Ownership verified before deletion.

**Success response `200`:**
```json
{ "success": true }
```

**Error responses:** `401` (unauthenticated), `400` (missing `id`), `404` (not found or not owned).

---

## Image Model

| Property      | Value                        |
|---------------|------------------------------|
| Model ID      | `imagen-3.0-generate-002`    |
| SDK call      | `ai.models.generateImages()` |
| Output format | `image/jpeg`                 |
| Images/call   | 1                            |
| Aspect ratios | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |
| SDK package   | `@google/genai` `^2.19.0`   |

The model returns base64-encoded JPEG bytes in `response.generatedImages[0].image.imageBytes`. These are converted to a `Buffer` and uploaded directly to Supabase Storage — **base64 strings are never written to PostgreSQL**.

---

## Credit Flow

```
User clicks Generate
    │
    ▼
checkAndDeductCredits(userId, 5, "IMAGE_GENERATION")
    │  ├─ Reads current balance
    │  ├─ Throws InsufficientCreditsError if balance < 5  → 402 (no deduction)
    │  ├─ Decrements credits by 5
    │  └─ Creates UsageLog { serviceType: "IMAGE_GENERATION", creditsUsed: 5 }
    │
    ▼
ai.models.generateImages(...)
    │  └─ On failure → refundCredits(userId, 5, usageLogId) → 500 + refund message
    │
    ▼
uploadImageBuffer(userId, buffer)
    │  └─ On failure → refundCredits(userId, 5, usageLogId) → 500 + refund message
    │
    ▼
prisma.generatedImage.create(...)
    │
    ▼
Return { success, image, remainingCredits }
    │
    ▼
Client: setCredits(remainingCredits) — updates CreditBadge in header + sidebar instantly
```

---

## Supabase Storage Configuration

| Property     | Value                   |
|--------------|-------------------------|
| Bucket       | `generated-images`      |
| Access       | Public (read)           |
| Path pattern | `<userId>/<uuid>.jpg`   |
| Upload auth  | Service role key (server-only, never client) |
| Client       | `@supabase/supabase-js` direct client in `src/lib/storage.ts` |

The bucket must exist in your Supabase project with **public read** enabled. The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is required in `.env.local` and is accessed only in `src/lib/storage.ts` — it is never referenced from any `"use client"` file.

### `next.config.mjs` remote pattern added:
```js
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "kqpjwckfwnsaqfqgnzfo.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
  ],
},
```

---

## Real-Time Credit Sync

Credits update in the header and sidebar **without a page refresh**:

1. The server page passes `initialCredits` to `<ImageStudio />`.
2. `ImageStudio` calls `setCredits(initialCredits)` into the Zustand `useImageStore` on mount.
3. After a successful generation, the API returns `remainingCredits`.
4. `PromptBar` calls `setCredits(data.remainingCredits)` immediately.
5. Any component reading `useImageStore((s) => s.credits)` re-renders automatically — including the credit gate check in `PromptBar` and any future widgets subscribing to the store.

> Note: `CreditBadge` and `SidebarCreditBadge` in the layout are server-rendered and reflect the balance at page load. The client-side store handles live updates within the session. A full page refresh (e.g. navigating away and back) re-fetches the authoritative balance from the database via the layout server component.

---

## Prisma Models Used

```prisma
model GeneratedImage {
  id        String   @id @default(uuid())
  userId    String
  prompt    String
  imageUrl  String   // Supabase Storage public URL
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UsageLog {
  id          String   @id @default(uuid())
  userId      String
  serviceType String   // "IMAGE_GENERATION" for this feature
  creditsUsed Int
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Environment Variables Required

| Variable                      | Used in              | Purpose                                      |
|-------------------------------|----------------------|----------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | `storage.ts`, layout | Supabase project URL                         |
| `SUPABASE_SERVICE_ROLE_KEY`   | `storage.ts` only    | Bypasses RLS for storage uploads (server-only) |
| `GEMINI_API_KEY`              | `lib/gemini.ts`      | Authenticates Google Gen AI SDK calls        |

---

## UI Components Summary

| File              | Type   | Responsibility                                                     |
|-------------------|--------|--------------------------------------------------------------------|
| `image-store.ts`  | Client | Zustand store — single source of truth for images, credits, state  |
| `image-studio.tsx`| Client | Root wrapper — hydrates store from server props, composes layout   |
| `prompt-bar.tsx`  | Client | Prompt input, aspect ratio toggle, generate button, credit gate    |
| `image-gallery.tsx`| Client| Responsive grid, loading shimmer, hover overlay, download/copy/delete |
| `layout.tsx`      | Server | Sidebar, header, credit badge — identical pattern to billing layout |
| `page.tsx`        | Server | Auth guard, DB fetch, serializes data, renders `<ImageStudio />`   |
