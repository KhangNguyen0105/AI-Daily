/**
 * Exchange rate worker: fetches USD/VND rate from a free public API,
 * stores it in the database, and provides a lookup function with fallback chain.
 *
 * Fallback chain: API fetch → last known DB rate → hardcoded 25500.
 *
 * Per PRIC-07: Dynamic USD/VND exchange rate for currency toggle.
 */

import { eq, desc, and, gte } from 'drizzle-orm';
import { db } from '@/src/db';
import { exchangeRates } from '@/src/db/schema';

/** Hardcoded fallback rate (1 USD = 25,500 VND) */
export const FALLBACK_RATE = 25500;

/** Free exchange rate API (no API key required) */
const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/USD';

/**
 * Fetch the latest USD/VND exchange rate from the public API.
 * Returns null if the fetch fails or the response is invalid.
 */
async function fetchRateFromApi(): Promise<number | null> {
  try {
    const response = await fetch(EXCHANGE_RATE_API, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.warn(`Exchange rate API returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };

    if (data.result !== 'success' || !data.rates?.VND) {
      console.warn('Exchange rate API response missing VND rate');
      return null;
    }

    return data.rates.VND;
  } catch (err) {
    console.warn('Failed to fetch exchange rate from API:', err);
    return null;
  }
}

/**
 * Get the most recent USD→VND rate from the database.
 * Returns null if no rate has been stored yet.
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
  } catch (err) {
    console.warn('Failed to read exchange rate from DB:', err);
    return null;
  }
}

/**
 * Store a USD→VND rate in the database.
 * Skips insertion if a rate with the same value was already fetched today.
 */
async function storeRate(rate: number): Promise<void> {
  try {
    // Check if we already have this rate for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db
      .select({ id: exchangeRates.id })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, 'USD'),
          eq(exchangeRates.toCurrency, 'VND'),
          gte(exchangeRates.fetchedAt, today)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return; // Rate already stored
    }

    await db.insert(exchangeRates).values({
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate,
    });
  } catch (err) {
    console.warn('Failed to store exchange rate in DB:', err);
  }
}

/**
 * Fetch and store the latest USD/VND exchange rate.
 * Called once per day during the collection pipeline.
 *
 * Fallback chain:
 * 1. Fetch from open.er-api.com
 * 2. If API fails, use last known DB rate
 * 3. If no DB rate, use hardcoded 25500
 */
export async function updateExchangeRate(): Promise<number> {
  // 1. Try API
  const apiRate = await fetchRateFromApi();
  if (apiRate !== null) {
    await storeRate(apiRate);
    console.log(`Exchange rate updated from API: 1 USD = ${apiRate} VND`);
    return apiRate;
  }

  // 2. Try DB
  const dbRate = await getRateFromDb();
  if (dbRate !== null) {
    console.log(`Using last known DB rate: 1 USD = ${dbRate} VND`);
    return dbRate;
  }

  // 3. Hardcoded fallback
  console.warn(`Using hardcoded fallback rate: 1 USD = ${FALLBACK_RATE} VND`);
  return FALLBACK_RATE;
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
