import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import { CreditSummaryCard } from "./_components/credit-summary-card";
import { PricingCards } from "./_components/pricing-cards";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/auth/v2/login");

  const dbUser = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.email!,
      credits: 50,
      plan: "FREE",
    },
    select: {
      credits: true,
      plan: true,
      usageLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { serviceType: true, creditsUsed: true },
      },
    },
  });

  const chatCreditsUsed = dbUser.usageLogs
    .filter((l) => l.serviceType === "CHAT")
    .reduce((s, l) => s + l.creditsUsed, 0);

  const imageCreditsUsed = dbUser.usageLogs
    .filter((l) => l.serviceType === "IMAGE")
    .reduce((s, l) => s + l.creditsUsed, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-semibold text-2xl leading-none tracking-tight">Billing & Credits</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Manage your plan and credit balance.
        </p>
      </div>

      <CreditSummaryCard
        credits={dbUser.credits}
        plan={dbUser.plan}
        chatCreditsUsed={chatCreditsUsed}
        imageCreditsUsed={imageCreditsUsed}
      />

      <div>
        <h2 className="mb-4 font-semibold text-lg leading-none tracking-tight">
          Plans & Top-ups
        </h2>
        <PricingCards currentPlan={dbUser.plan} />
      </div>
    </div>
  );
}
