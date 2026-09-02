import type { ReactNode } from "react";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider } from "@/components/ui/sidebar";

import { ChatHeader } from "./_components/chat-header";
import { ChatSidebar } from "./_components/chat-sidebar";

export default async function ChatLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Fetch credits here so the header widget always reflects the real balance
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let credits = 0;
  if (authUser) {
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
    credits = dbUser.credits;
  }

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <ChatHeader credits={credits} />
        <div className="flex min-h-0 max-h-[92vh] flex-1">
          <ChatSidebar />
          {children}
        </div>
      </SidebarProvider>
    </div>
  );
}
