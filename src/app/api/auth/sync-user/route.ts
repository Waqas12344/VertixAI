import { NextResponse } from "next/server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

export async function POST(request: Request) {
  // Verify the caller is actually authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only allow syncing the currently authenticated user
  if (parsed.data.id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbUser = await prisma.user.upsert({
    where: { id: parsed.data.id },
    update: {},
    create: {
      id: parsed.data.id,
      email: parsed.data.email,
      credits: 50,
      plan: "FREE",
    },
  });

  return NextResponse.json({ credits: dbUser.credits, plan: dbUser.plan });
}
