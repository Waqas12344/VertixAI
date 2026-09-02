import { NextResponse } from "next/server";
import { z } from "zod";

import { ai } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  InsufficientCreditsError,
  checkAndDeductCredits,
} from "@/lib/credits";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------
const bodySchema = z.object({
  prompt: z.string().min(1).max(32_000),
  conversationId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate body
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

  const { prompt, conversationId } = parsed.data;

  // 3. Deduct 1 credit atomically (throws InsufficientCreditsError if broke)
  try {
    await checkAndDeductCredits(user.id, 1, "CHAT");
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "insufficient_credits", message: err.message },
        { status: 402 },
      );
    }
    throw err;
  }

  // 4. Find or create the Conversation record
  let conversation: { id: string; title: string };

  if (conversationId) {
    // Verify ownership before using it
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      select: { id: true, title: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
    conversation = existing;
  } else {
    // New conversation — derive a short title from the prompt
    const title =
      prompt.length > 60 ? `${prompt.slice(0, 57).trimEnd()}…` : prompt;
    conversation = await prisma.conversation.create({
      data: { userId: user.id, title },
      select: { id: true, title: true },
    });
  }

  // 5. Load past messages for multi-turn context
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // 6. Build the Gemini `contents` array (prior turns + new user prompt)
  //    Gemini expects alternating user/model turns. We append the new prompt
  //    at the end so the model replies to it.
  type GeminiRole = "user" | "model";
  const contents = [
    ...history.map((m) => ({
      role: m.role as GeminiRole,
      parts: [{ text: m.content }],
    })),
    { role: "user" as GeminiRole, parts: [{ text: prompt }] },
  ];

  // 7. Stream response back to the client via a ReadableStream
  //    We also accumulate the full text to persist it once the stream ends.
  const encoder = new TextEncoder();
  let fullAssistantResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await ai.models.generateContentStream({
          model: "gemini-3.6-flash",
          contents,
        });

        for await (const chunk of result) {
          const text = chunk.text ?? "";
          if (text) {
            fullAssistantResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // 8. Persist user prompt + assistant response once streaming is done
        await prisma.message.createMany({
          data: [
            {
              conversationId: conversation.id,
              role: "user",
              content: prompt,
            },
            {
              conversationId: conversation.id,
              role: "model",
              content: fullAssistantResponse,
            },
          ],
        });

        // Touch the conversation's updatedAt so it sorts first in history
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Conversation-Id": conversation.id,
      "X-Conversation-Title": encodeURIComponent(conversation.title),
    },
  });
}
