import { prisma } from './prisma.js';
import { claude } from './claude.js';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';

// Anthropic pricing (as of Jan 2024)
// Claude 3.5 Sonnet: $3/1M input tokens, $15/1M output tokens
const INPUT_TOKEN_PRICE_PER_MILLION = 3.00;
const OUTPUT_TOKEN_PRICE_PER_MILLION = 15.00;
const MARKUP_MULTIPLIER = 1.20; // 20% markup

/**
 * Calculate the cost in cents for a given number of tokens
 */
export function calculateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * INPUT_TOKEN_PRICE_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_TOKEN_PRICE_PER_MILLION;
  const totalCost = (inputCost + outputCost) * MARKUP_MULTIPLIER;
  
  // Convert to cents and round up
  return Math.ceil(totalCost * 100);
}

/**
 * Check if user has sufficient credits for an estimated operation
 */
export async function checkCredits(userId: string, estimatedCostCents: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user) return false;
  return user.creditBalance >= estimatedCostCents;
}

/**
 * Deduct credits from a user's balance
 */
export async function deductCredits(userId: string, costCents: number, endpoint: string, inputTokens: number, outputTokens: number): Promise<void> {
  await prisma.$transaction([
    // Deduct credits
    prisma.user.update({
      where: { id: userId },
      data: {
        creditBalance: {
          decrement: costCents,
        },
      },
    }),
    // Record usage
    prisma.tokenUsage.create({
      data: {
        userId,
        inputTokens,
        outputTokens,
        costCents,
        endpoint,
      },
    }),
  ]);
}

/**
 * Get user's current credit balance
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });
  return user?.creditBalance ?? 0;
}

/**
 * Add credits to a user's balance (for purchases)
 */
export async function addCredits(userId: string, amountCents: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: {
        increment: amountCents,
      },
    },
  });
}

/**
 * Get usage history for a user
 */
export async function getUsageHistory(userId: string, limit: number = 50) {
  return prisma.tokenUsage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get total usage stats for a user
 */
export async function getUsageStats(userId: string) {
  const stats = await prisma.tokenUsage.aggregate({
    where: { userId },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      costCents: true,
    },
    _count: true,
  });

  return {
    totalInputTokens: stats._sum.inputTokens ?? 0,
    totalOutputTokens: stats._sum.outputTokens ?? 0,
    totalCostCents: stats._sum.costCents ?? 0,
    totalRequests: stats._count,
  };
}

export type BilledClaudeResponse = {
  response: Awaited<ReturnType<typeof claude.messages.create>>;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Make a Claude API call with automatic billing.
 * Checks credits before the call and deducts after.
 */
export async function billedClaudeCall(
  userId: string,
  endpoint: string,
  params: MessageCreateParams,
  estimatedInputTokens: number = 2000 // Default estimate for credit check
): Promise<BilledClaudeResponse> {
  // Estimate cost for pre-check (assume 2000 output tokens typical response)
  const estimatedCost = calculateCostCents(estimatedInputTokens, 2000);
  
  // Check if user has enough credits
  const hasCredits = await checkCredits(userId, estimatedCost);
  if (!hasCredits) {
    throw new Error('Insufficient credits');
  }

  // Make the API call
  const response = await claude.messages.create(params);

  // Calculate actual cost from usage
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const actualCost = calculateCostCents(inputTokens, outputTokens);

  // Deduct the actual cost
  await deductCredits(userId, actualCost, endpoint, inputTokens, outputTokens);

  return {
    response,
    costCents: actualCost,
    inputTokens,
    outputTokens,
  };
}

/**
 * Estimate cost for a message (useful for showing users before they send)
 */
export function estimateCost(messageLength: number): { estimatedCents: number; description: string } {
  // Rough estimate: 1 character ≈ 0.3 tokens for input
  const estimatedInputTokens = Math.ceil(messageLength * 0.3);
  // Assume average response is 2000 tokens
  const estimatedOutputTokens = 2000;
  const estimatedCents = calculateCostCents(estimatedInputTokens, estimatedOutputTokens);
  
  return {
    estimatedCents,
    description: `Estimated cost: ~$${(estimatedCents / 100).toFixed(3)}`,
  };
}
