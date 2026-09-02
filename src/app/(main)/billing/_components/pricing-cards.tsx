"use client";

import { useState } from "react";

import {
  BadgeCheck,
  Bot,
  CheckCircle2,
  Coins,
  ImageIcon,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with 50 credits to explore all AI features.",
    credits: 50,
    badge: null,
    features: [
      { icon: <Coins className="size-3.5" />, text: "50 starter credits" },
      { icon: <Bot className="size-3.5" />, text: "AI Chat (1 credit/msg)" },
      { icon: <ImageIcon className="size-3.5" />, text: "Image generation (5 credits/img)" },
      { icon: <BadgeCheck className="size-3.5" />, text: "Standard model access" },
    ],
    cta: "Current Plan",
    planKey: "FREE",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "1,500 credits every month with priority processing.",
    credits: 1500,
    badge: "Most Popular",
    features: [
      { icon: <Coins className="size-3.5" />, text: "1,500 credits / month" },
      { icon: <Bot className="size-3.5" />, text: "Priority AI Chat" },
      { icon: <ImageIcon className="size-3.5" />, text: "Fast image generation" },
      { icon: <Sparkles className="size-3.5" />, text: "Access to latest Gemini models" },
      { icon: <Zap className="size-3.5" />, text: "Credits roll over (up to 500)" },
    ],
    cta: "Upgrade to Pro",
    planKey: "PRO",
    highlight: true,
  },
];

const TOP_UPS = [
  { id: "topup-100", credits: 100, price: "$1.99", pricePerCredit: "$0.020" },
  { id: "topup-500", credits: 500, price: "$7.99", pricePerCredit: "$0.016", popular: true },
  { id: "topup-1000", credits: 1000, price: "$13.99", pricePerCredit: "$0.014" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PricingCardsProps {
  currentPlan: string;
}

export function PricingCards({ currentPlan }: PricingCardsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function handleCheckout(id: string, label: string) {
    setLoadingId(id);
    // Payment gateway integration point (Safepay / Lemon Squeezy)
    toast.info(`Checkout for "${label}" coming soon.`);
    setTimeout(() => setLoadingId(null), 1500);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const isActive = currentPlan === plan.planKey;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-shadow",
                plan.highlight && "border-primary shadow-md shadow-primary/10",
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isActive && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <CheckCircle2 className="size-3" />
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-3xl">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/ {plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-3">
                <ul className="flex flex-col gap-2">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">{f.icon}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  disabled={isActive || loadingId === plan.id}
                  onClick={() => !isActive && handleCheckout(plan.id, plan.name)}
                >
                  {isActive ? "Current Plan" : loadingId === plan.id ? "Redirecting…" : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Credit top-up packs */}
      <div>
        <h3 className="mb-1 font-semibold text-base leading-none">One-Time Credit Top-ups</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          Need more credits without changing your plan? Buy a pack anytime.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TOP_UPS.map((pack) => (
            <Card
              key={pack.id}
              className={cn(
                "relative flex flex-col transition-shadow",
                pack.popular && "border-primary shadow-sm shadow-primary/10",
              )}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm text-xs">
                    Best value
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <Coins className="size-4 text-amber-500" />
                  <CardTitle className="text-base tabular-nums">
                    {pack.credits} credits
                  </CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-2xl">{pack.price}</span>
                  <span className="text-muted-foreground text-xs">{pack.pricePerCredit}/cr</span>
                </div>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Button
                  className="w-full"
                  variant={pack.popular ? "default" : "outline"}
                  size="sm"
                  disabled={loadingId === pack.id}
                  onClick={() =>
                    handleCheckout(pack.id, `${pack.credits} credit pack`)
                  }
                >
                  {loadingId === pack.id ? "Redirecting…" : `Buy ${pack.credits} credits`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
