import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { CreditBadge } from "@/components/shared/credit-badge";
import { SidebarCreditBadge } from "@/components/shared/sidebar-credit-badge";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";

import { LayoutControls } from "../dashboard/_components/header/layout-controls";
import { SearchDialog } from "../dashboard/_components/header/search-dialog";
import { ThemeSwitcher } from "../dashboard/_components/header/theme-switcher";

export default async function BillingLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const [variant, collapsible, supabase] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
    createClient(),
  ]);

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

  const navUser = authUser
    ? {
        name:
          authUser.user_metadata?.full_name ??
          authUser.user_metadata?.name ??
          authUser.email?.split("@")[0] ??
          "User",
        email: authUser.email ?? "",
        avatar: authUser.user_metadata?.avatar_url ?? "",
      }
    : { name: "User", email: "", avatar: "" };

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "calc(var(--spacing) * 68)" } as React.CSSProperties}
    >
      <AppSidebar
        variant={variant}
        collapsible={collapsible}
        navUser={navUser}
        creditBadge={<SidebarCreditBadge credits={credits} />}
      />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "min-w-0 overflow-x-clip",
        )}
      >
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear",
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-2">
              <CreditBadge credits={credits} />
              <LayoutControls />
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
