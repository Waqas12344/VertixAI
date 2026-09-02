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

const bodySchema = z.object({
  prompt: z.string().min(1).max(32_000),
  conversationId: z.string().uuid().optional(),
  model: z.enum(VALID_MODEL_IDS).optional().default(DEFAULT_MODEL_ID),
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

  const { prompt, conversationId, model: modelId } = parsed.data;

  // ── 3. Resolve model config ───────────────────────────────────────────────
  const modelConfig = findModel(modelId)!;
  const { creditCost } = modelConfig;

  // ── 4. Deduct credits atomically ──────────────────────────────────────────
  // This happens BEFORE opening the stream so we can still return a normal
  // JSON error response if the balance is insufficient.
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
      // Credits were deducted but we can't proceed — refund immediately.
      await refundCredits(user.id, creditCost, usageLogId);
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
    conversation = existing;
  } else {
    const title =
      prompt.length > 60 ? `${prompt.slice(0, 57).trimEnd()}…` : prompt;
    conversation = await prisma.conversation.create({
      data: { userId: user.id, title },
      select: { id: true, title: true },
    });
  }

  // ── 6. Build Gemini contents (multi-turn history) ─────────────────────────
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  type GeminiRole = "user" | "model";
  const contents = [
    ...history.map((m) => ({
      role: m.role as GeminiRole,
      parts: [{ text: m.content }],
    })),
    { role: "user" as GeminiRole, parts: [{ text: prompt }] },
  ];

  // ── 7. Stream — with full rollback on any failure ─────────────────────────
  //
  // IMPORTANT: once we call `new Response(stream, ...)` the HTTP response
  // headers are sent and we can no longer return a JSON error. All failures
  // inside the ReadableStream must:
  //   a) refund the credits via refundCredits()
  //   b) signal the error to the client via controller.error()
  //      (the client's fetch reader will reject, triggering the error handler
  //       in sendMessage which shows an in-thread error bubble)
  //
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

        // ── 7b. Pipe chunks to the client ───────────────────────────────────
        for await (const chunk of result) {
          const text = chunk.text ?? "";
          if (text) {
            fullAssistantResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // ── 7c. Persist messages only on clean stream completion ────────────
        await prisma.message.createMany({
          data: [
            { conversationId: conversation.id, role: "user",  content: prompt },
            { conversationId: conversation.id, role: "model", content: fullAssistantResponse },
          ],
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        controller.close();

      } catch (generationError) {
        // ── 7d. Rollback — refund credits and mark the log as refunded ───────
        //
        // We best-effort the refund: log failures but don't let a refund error
        // mask the original generation error from reaching the client.
        try {
          await refundCredits(user.id, creditCost, usageLogId);
        } catch (refundError) {
          console.error(
            "[chat/route] Credit refund failed after generation error:",
            refundError,
          );
        }

        // Signal the error downstream so the client fetch reader rejects
        // and the in-thread error bubble is shown.
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
