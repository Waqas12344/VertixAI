import { prisma } from "@/lib/prisma";

export class InsufficientCreditsError extends Error {
  constructor(available: number, required: number) {
    super(`Insufficient credits: need ${required}, have ${available}.`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Atomically checks the user's credit balance and deducts `cost` credits
 * within a single Prisma interactive transaction. Also writes a UsageLog entry.
 *
 * @throws {InsufficientCreditsError} when balance < cost
 * @returns The updated credit balance after deduction
 */
export async function checkAndDeductCredits(
  userId: string,
  cost: number,
  serviceType: string,
): Promise<number> {
  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found.`);
    }

    if (user.credits < cost) {
      throw new InsufficientCreditsError(user.credits, cost);
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
      select: { credits: true },
    });

    await tx.usageLog.create({
      data: {
        userId,
        serviceType,
        creditsUsed: cost,
      },
    });

    return updated;
  });

  return updatedUser.credits;
}

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
