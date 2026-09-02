import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import { ChatThread } from "./_components/chat-thread";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/auth/v2/login");

  // Upsert ensures there is always a DB record even on first visit
  const dbUser = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.email!,
      credits: 50,
      plan: "FREE",
    },
    select: { credits: true },
  });

  return (
    <main className="flex   flex-1 flex-col overflow-hidden">
      <ChatThread credits={dbUser.credits} />
    </main>
  );
}
