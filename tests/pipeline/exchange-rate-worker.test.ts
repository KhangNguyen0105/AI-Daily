import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('@/src/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock the schema
vi.mock('@/src/db/schema', () => ({
  exchangeRates: {
    fromCurrency: 'from_currency',
    toCurrency: 'to_currency',
    rate: 'rate',
    fetchedAt: 'fetched_at',
  },
}));

import { FALLBACK_RATE, getLatestExchangeRate, updateExchangeRate } from '../../src/pipeline/exchange-rate-worker';
import { db } from '@/src/db';

describe('FALLBACK_RATE', () => {
  it('is 25500', () => {
    expect(FALLBACK_RATE).toBe(25500);
  });
});

describe('getLatestExchangeRate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rate from DB when available', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ rate: 26000 }]),
          }),
        }),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

    const rate = await getLatestExchangeRate();
    expect(rate).toBe(26000);
  });

  it('falls back to hardcoded rate when DB returns no rows', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

    const rate = await getLatestExchangeRate();
    expect(rate).toBe(FALLBACK_RATE);
  });

  it('falls back to hardcoded rate when DB throws', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

    const rate = await getLatestExchangeRate();
    expect(rate).toBe(FALLBACK_RATE);
  });
});

describe('updateExchangeRate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('fetches rate from API and stores it', async () => {
    // Mock successful API response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'success', rates: { VND: 26000 } }),
    }));

    // Mock DB select for dedup check (no existing rate today)
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

    // Mock DB insert
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

    const rate = await updateExchangeRate();
    expect(rate).toBe(26000);
    expect(fetch).toHaveBeenCalledWith(
      'https://open.er-api.com/v6/latest/USD',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(db.insert).toHaveBeenCalled();
  });

  it('falls back to DB rate when API fails', async () => {
    // Mock failed API response
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    // Mock DB select returning a stored rate
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ rate: 25800 }]),
          }),
        }),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

    const rate = await updateExchangeRate();
    expect(rate).toBe(25800);
  });

  it('falls back to hardcoded rate when API and DB both fail', async () => {
    // Mock failed API response
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    // Mock DB returning no rows
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

    const rate = await updateExchangeRate();
    expect(rate).toBe(FALLBACK_RATE);
  });
});
