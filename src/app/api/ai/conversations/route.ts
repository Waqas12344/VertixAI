import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/ai/conversations
// Returns all conversations for the authenticated user, newest first.
// ---------------------------------------------------------------------------
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      // Include the last message snippet for sidebar previews
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { role: true, content: true },
      },
    },
  });

  return NextResponse.json({ conversations });
}

// ---------------------------------------------------------------------------
// DELETE /api/ai/conversations
// Body: { id: string }  — deletes only if owned by the current user.
// ---------------------------------------------------------------------------
const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Confirm ownership before deleting (Cascade removes child Messages too)
  const conversation = await prisma.conversation.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  await prisma.conversation.delete({ where: { id: conversation.id } });

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// PATCH /api/ai/conversations
// Body: { id: string, title: string }  — renames a conversation.
// ---------------------------------------------------------------------------
const renameSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const existing = await prisma.conversation.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const updated = await prisma.conversation.update({
    where: { id: existing.id },
    data: { title: parsed.data.title },
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json({ conversation: updated });
}
