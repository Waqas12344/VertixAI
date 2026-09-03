import { NextResponse } from "next/server";
import { z } from "zod";

import { CHAT_MODELS, DEFAULT_MODEL_ID, findModel } from "@/config/ai-models";
import { ai } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  InsufficientCreditsError,
  checkAndDeductCredits,
  refundCredits,
} from "@/lib/credits";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------
const VALID_MODEL_IDS = CHAT_MODELS.map((m) => m.id) as [string, ...string[]];

const imageSchema = z.object({
  /** Raw base64 string (no data-URL prefix). */
  data: z.string().min(1),
  /** MIME type validated to the three supported formats. */
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

const bodySchema = z.object({
  prompt: z.string().min(0).max(32_000),
  conversationId: z.string().uuid().optional(),
  model: z.enum(VALID_MODEL_IDS).optional().default(DEFAULT_MODEL_ID),
  images: z.array(imageSchema).max(4).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Validate body ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { prompt, conversationId, model: modelId, images } = parsed.data;

  // Must have either a text prompt or at least one image
  if (!prompt && (!images || images.length === 0)) {
    return NextResponse.json(
      { error: "Provide a text prompt or at least one image." },
      { status: 400 },
    );
  }

  // ── 3. Resolve model config ───────────────────────────────────────────────
  const modelConfig = findModel(modelId)!;
  const { creditCost } = modelConfig;

  // ── 4. Deduct credits atomically ──────────────────────────────────────────
  let usageLogId: string;
  try {
    const deduction = await checkAndDeductCredits(user.id, creditCost, "CHAT");
    usageLogId = deduction.usageLogId;
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "insufficient_credits", message: err.message },
        { status: 402 },
      );
    }
    throw err;
  }

  // ── 5. Resolve / create Conversation ─────────────────────────────────────
  let conversation: { id: string; title: string };

  if (conversationId) {
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      select: { id: true, title: true },
    });
    if (!existing) {
      await refundCredits(user.id, creditCost, usageLogId);
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    conversation = existing;
  } else {
    // Use prompt as title, or a placeholder for image-only messages
    const titleSource = prompt.trim() || "Image message";
    const title =
      titleSource.length > 60
        ? `${titleSource.slice(0, 57).trimEnd()}…`
        : titleSource;
    conversation = await prisma.conversation.create({
      data: { userId: user.id, title },
      select: { id: true, title: true },
    });
  }

  // ── 6. Build Gemini contents ──────────────────────────────────────────────
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  type GeminiRole = "user" | "model";
  type GeminiPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  // Build the parts array for the current user turn:
  // images first (Gemini convention), then the text prompt
  const currentTurnParts: GeminiPart[] = [
    ...(images ?? []).map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
    ...(prompt ? [{ text: prompt }] : []),
  ];

  const contents = [
    ...history.map((m) => ({
      role: m.role as GeminiRole,
      parts: [{ text: m.content }] as GeminiPart[],
    })),
    { role: "user" as GeminiRole, parts: currentTurnParts },
  ];

  // ── 7. Stream — full rollback on any failure ──────────────────────────────
  const encoder = new TextEncoder();
  let fullAssistantResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── 7a. Call Gemini ─────────────────────────────────────────────────
        const result = await ai.models.generateContentStream({
          model: modelId,
          contents,
        });

        // ── 7b. Pipe chunks ─────────────────────────────────────────────────
        for await (const chunk of result) {
          const text = chunk.text ?? "";
          if (text) {
            fullAssistantResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // ── 7c. Persist on clean completion ─────────────────────────────────
        // We store only the text of the user turn in the DB (images are not
        // persisted to the DB per the AGENTS.md constraint — no base64 in PG).
        await prisma.message.createMany({
          data: [
            {
              conversationId: conversation.id,
              role: "user",
              content: prompt || "[image]",
            },
            {
              conversationId: conversation.id,
              role: "model",
              content: fullAssistantResponse,
            },
          ],
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        controller.close();

      } catch (generationError) {
        // ── 7d. Rollback credits ────────────────────────────────────────────
        try {
          await refundCredits(user.id, creditCost, usageLogId);
        } catch (refundError) {
          console.error(
            "[chat/route] Credit refund failed after generation error:",
            refundError,
          );
        }
        controller.error(generationError);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Conversation-Id": conversation.id,
      "X-Conversation-Title": encodeURIComponent(conversation.title),
      "X-Model-Id": modelId,
    },
  });
}
