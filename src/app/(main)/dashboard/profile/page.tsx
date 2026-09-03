import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  BadgeCheck,
  Bot,
  Calendar,
  Coins,
  CreditCard,
  ImageIcon,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { cn, getInitials } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAN_CREDITS: Record<string, number> = {
  FREE: 50,
  PRO: 1500,
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  CHAT: <Bot className="size-4 text-blue-500" />,
  IMAGE: <ImageIcon className="size-4 text-purple-500" />,
  PDF: <Sparkles className="size-4 text-amber-500" />,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/auth/v2/login");

  // Fetch user record + last 20 usage logs in one query
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
      createdAt: true,
      usageLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          serviceType: true,
          creditsUsed: true,
          createdAt: true,
        },
      },
    },
  });

  const displayName =
    authUser.user_metadata?.full_name ??
    authUser.user_metadata?.name ??
    authUser.email?.split("@")[0] ??
    "User";

  const avatarUrl = authUser.user_metadata?.avatar_url ?? "";
  const maxCredits = PLAN_CREDITS[dbUser.plan] ?? 50;
  const creditPct = Math.min(100, Math.round((dbUser.credits / maxCredits) * 100));

  const joinDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dbUser.createdAt));

  type LogEntry = { id: string; serviceType: string; creditsUsed: number; createdAt: Date };

  // Aggregate usage stats
  const totalSpent = dbUser.usageLogs.reduce((sum: number, l: LogEntry) => sum + l.creditsUsed, 0);
  const chatCount = dbUser.usageLogs.filter((l: LogEntry) => l.serviceType === "CHAT").length;
  const imageCount = dbUser.usageLogs.filter((l: LogEntry) => l.serviceType === "IMAGE").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Dashboard</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Profile</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-xl">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="rounded-xl text-lg">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-semibold text-xl leading-none">{displayName}</h1>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Mail className="size-3.5" />
                {authUser.email}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="size-3.5" />
                Joined {joinDate}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {dbUser.plan === "PRO" ? (
              <Badge className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                <Sparkles className="size-3" />
                Pro Plan
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                <ShieldCheck className="size-3" />
                Free Plan
              </Badge>
            )}
            {authUser.email_confirmed_at && (
              <Badge
                variant="outline"
                className="gap-1.5 border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400"
              >
                <BadgeCheck className="size-3" />
                Verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Credit balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Coins className="size-3.5" />
              Available Credits
            </CardDescription>
            <CardTitle
              className={cn(
                "text-3xl tabular-nums",
                dbUser.credits <= 5 && "text-destructive",
              )}
            >
              {dbUser.credits}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={creditPct} className="h-1.5" />
            <p className="mt-1.5 text-muted-foreground text-xs">
              {creditPct}% of {maxCredits} {dbUser.plan} credits
            </p>
          </CardContent>
        </Card>

        {/* Chat sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Bot className="size-3.5" />
              Chat Sessions
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{chatCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">1 credit each</p>
          </CardContent>
        </Card>

        {/* Images generated */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ImageIcon className="size-3.5" />
              Images Generated
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{imageCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">5 credits each</p>
          </CardContent>
        </Card>
      </div>

      {/* Account details + Usage log */}
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Account details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Email</dt>
                <dd className="truncate font-medium">{authUser.email}</dd>
              </div>
              <Separator />
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Plan</dt>
                <dd className="font-medium">{dbUser.plan}</dd>
              </div>
              <Separator />
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Credits remaining</dt>
                <dd
                  className={cn(
                    "font-medium tabular-nums",
                    dbUser.credits <= 5 && "text-destructive",
                  )}
                >
                  {dbUser.credits} / {maxCredits}
                </dd>
              </div>
              <Separator />
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Credits used (recent)</dt>
                <dd className="font-medium tabular-nums">{totalSpent}</dd>
              </div>
              <Separator />
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Member since</dt>
                <dd className="font-medium">{joinDate}</dd>
              </div>
              <Separator />
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">Auth provider</dt>
                <dd className="font-medium capitalize">
                  {authUser.app_metadata?.provider ?? "email"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Recent usage log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Usage</CardTitle>
            <CardDescription>Last {dbUser.usageLogs.length} operations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {dbUser.usageLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <CreditCard className="size-8 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No usage yet.</p>
                <p className="text-muted-foreground text-xs">
                  Start a chat or generate an image to see your activity here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbUser.usageLogs.map((log: LogEntry) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {SERVICE_ICONS[log.serviceType] ?? (
                            <Sparkles className="size-4 text-muted-foreground" />
                          )}
                          <span className="capitalize text-sm">
                            {log.serviceType.charAt(0) + log.serviceType.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="text-destructive">−{log.creditsUsed}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs tabular-nums">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(log.createdAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
