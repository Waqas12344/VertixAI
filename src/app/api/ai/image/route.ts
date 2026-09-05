import { NextResponse } from "next/server";
import { z } from "zod";

import { ai } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { uploadImageBuffer } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  InsufficientCreditsError,
  checkAndDeductCredits,
  refundCredits,
} from "@/lib/credits";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMAGE_COST = 5;
// gemini-2.5-flash-image (Nano Banana) has a free tier on AI Studio API keys
// (~500 images/day). gemini-3.1-flash-image is paid-only (free quota = 0).
// Both use the same ai.interactions.create() Interactions API path.
const IMAGE_MODEL = "gemini-2.5-flash-image";
const SERVICE_TYPE = "IMAGE_GENERATION";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  prompt: z.string().min(1, "Prompt is required.").max(2000),
  aspectRatio: z
    .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
    .optional()
    .default("1:1"),
});

// ---------------------------------------------------------------------------
// POST /api/ai/image  —  Generate a new image
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

  const { prompt, aspectRatio } = parsed.data;

  // ── 3. Deduct 5 credits atomically ────────────────────────────────────────
  let usageLogId: string;
  let remainingCredits: number;

  try {
    const deduction = await checkAndDeductCredits(user.id, IMAGE_COST, SERVICE_TYPE);
    usageLogId = deduction.usageLogId;
    remainingCredits = deduction.remainingCredits;
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "insufficient_credits", message: err.message },
        { status: 402 },
      );
    }
    throw err;
  }

  // ── 4. Generate image via Google Gen AI Interactions API ─────────────────
  let imageBase64: string;

  try {
    // ai.interactions.create is the supported path for image generation
    // on standard Gemini API keys (AI Studio). The old generateImages()
    // method required Vertex AI and has been deprecated.
    const interaction = await ai.interactions.create({
      model: IMAGE_MODEL,
      input: prompt,
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: aspectRatio,
      },
    });

    const b64 = interaction.output_image?.data;

    if (!b64) {
      throw new Error("No image data returned from the model.");
    }

    imageBase64 = b64;
  } catch (generationError) {
    // ── 4a. Refund on failure ─────────────────────────────────────────────
    try {
      await refundCredits(user.id, IMAGE_COST, usageLogId);
    } catch (refundErr) {
      console.error("[image/route] Credit refund failed:", refundErr);
    }

    console.error("[image/route] Generation error:", generationError);

    // Surface quota/rate-limit errors with a clear message so the client
    // can display something actionable rather than a generic "failed" toast.
    const isRateLimit =
      generationError instanceof Error &&
      ("statusCode" in generationError
        ? (generationError as { statusCode?: number }).statusCode === 429
        : generationError.message.includes("429") ||
          generationError.message.toLowerCase().includes("quota"));

    if (isRateLimit) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message:
            "The image model is temporarily rate-limited. Your 5 credits have been refunded. Please wait a moment and try again.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "generation_failed",
        message: "Generation failed. Your 5 credits have been refunded.",
      },
      { status: 500 },
    );
  }

  // ── 5. Upload buffer to Supabase Storage ──────────────────────────────────
  let imageUrl: string;

  try {
    const buffer = Buffer.from(imageBase64, "base64");
    imageUrl = await uploadImageBuffer(user.id, buffer);
  } catch (storageError) {
    // Refund if we can't persist the image
    try {
      await refundCredits(user.id, IMAGE_COST, usageLogId);
    } catch (refundErr) {
      console.error("[image/route] Credit refund failed after storage error:", refundErr);
    }

    console.error("[image/route] Storage error:", storageError);
    return NextResponse.json(
      {
        error: "storage_failed",
        message: "Generation failed. Your 5 credits have been refunded.",
      },
      { status: 500 },
    );
  }

  // ── 6. Persist metadata to Prisma ─────────────────────────────────────────
  const generatedImage = await prisma.generatedImage.create({
    data: {
      userId: user.id,
      prompt,
      imageUrl,
    },
    select: {
      id: true,
      prompt: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  // ── 7. Return success ─────────────────────────────────────────────────────
  return NextResponse.json(
    {
      success: true,
      image: generatedImage,
      remainingCredits,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// GET /api/ai/image  —  Fetch all generated images for the authenticated user
// ---------------------------------------------------------------------------

export async function GET() {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Fetch images ───────────────────────────────────────────────────────
  const images = await prisma.generatedImage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prompt: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ images });
}

// ---------------------------------------------------------------------------
// DELETE /api/ai/image  —  Remove a specific generated image
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Validate query param ───────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing required query param: id" },
      { status: 400 },
    );
  }

  // ── 3. Verify ownership then delete ──────────────────────────────────────
  const image = await prisma.generatedImage.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!image) {
    return NextResponse.json(
      { error: "Image not found or access denied." },
      { status: 404 },
    );
  }

  await prisma.generatedImage.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
