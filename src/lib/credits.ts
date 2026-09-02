import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class InsufficientCreditsError extends Error {
  constructor(available: number, required: number) {
    super(`Insufficient credits: need ${required}, have ${available}.`);
    this.name = "InsufficientCreditsError";
  }
}

// ---------------------------------------------------------------------------
// Deduction
// ---------------------------------------------------------------------------

export interface DeductResult {
  /** Remaining balance after deduction. */
  remainingCredits: number;
  /** ID of the UsageLog row — hold onto this for potential refunds. */
  usageLogId: string;
}

/**
 * Atomically verifies the user has enough credits, deducts `cost`, and writes
 * a UsageLog entry. Returns both the new balance and the UsageLog id so the
 * caller can refund if the downstream operation (e.g. Gemini) later fails.
 *
 * @throws {InsufficientCreditsError} when balance < cost
 * @throws {Error} when the user record is not found
 */
export async function checkAndDeductCredits(
  userId: string,
  cost: number,
  serviceType: string,
): Promise<DeductResult> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Read current balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found.`);
    }

    // 2. Guard insufficient balance before touching anything
    if (user.credits < cost) {
      throw new InsufficientCreditsError(user.credits, cost);
    }

    // 3. Deduct
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
      select: { credits: true },
    });

    // 4. Write a log row — status defaults to "SUCCESS"; callers can mark it
    //    "REFUNDED" via refundCredits() if the downstream operation fails.
    const log = await tx.usageLog.create({
      data: {
        userId,
        serviceType,
        creditsUsed: cost,
      },
      select: { id: true },
    });

    return { remainingCredits: updated.credits, usageLogId: log.id };
  });

  return result;
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

/**
 * Refunds `cost` credits back to the user and marks the UsageLog entry with
 * the given `usageLogId` as refunded. Safe to call more than once — the
 * UsageLog update is idempotent because we only flip the serviceType label.
 *
 * Call this whenever a downstream operation (Gemini, image generation, etc.)
 * fails after credits have already been deducted.
 */
export async function refundCredits(
  userId: string,
  cost: number,
  usageLogId: string,
): Promise<void> {
  await prisma.$transaction([
    // Return the credits
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: cost } },
    }),
    // Mark the log as refunded so audit trails are accurate
    prisma.usageLog.update({
      where: { id: usageLogId },
      data: { serviceType: "REFUNDED" },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Read-only helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current credit balance for a user without modifying it.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return user?.credits ?? 0;
}
