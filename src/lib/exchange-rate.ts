/**
 * Standalone exchange rate utility for frontend use.
 *
 * IN-01: Extracted from pipeline/exchange-rate-worker.ts to decouple
 * the public landing page from the pipeline module.
 *
 * This module contains only the DB lookup and fallback constant.
 * The pipeline worker (updateExchangeRate, fetchRateFromApi) remains
 * in exchange-rate-worker.ts since those are pipeline-only concerns.
 */

import { eq, desc, and } from 'drizzle-orm';
import { db } from '@/src/db';
import { exchangeRates } from '@/src/db/schema';

/** Hardcoded fallback rate (1 USD = 25,500 VND) */
export const FALLBACK_RATE = 25500;

/**
 * Get the most recent USD→VND rate from the database.
 * Returns null if no rate has been stored yet or DB is unavailable.
 */
async function getRateFromDb(): Promise<number | null> {
  try {
    const rows = await db
      .select({ rate: exchangeRates.rate })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, 'USD'),
          eq(exchangeRates.toCurrency, 'VND')
        )
      )
      .orderBy(desc(exchangeRates.fetchedAt))
      .limit(1);

    return rows[0]?.rate ?? null;
  } catch {
    // DB not available during build — return null for fallback
    return null;
  }
}

/**
 * Get the latest USD→VND exchange rate for frontend use.
 * Queries the most recent rate from the database.
 * Falls back to hardcoded constant if no rate is available.
 *
 * @returns The current USD→VND exchange rate
 */
export async function getLatestExchangeRate(): Promise<number> {
  const dbRate = await getRateFromDb();
  return dbRate ?? FALLBACK_RATE;
}
