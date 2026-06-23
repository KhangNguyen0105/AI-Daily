import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/src/db/index', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
}));

describe('GET /api/digest-promotions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid date format', async () => {
    const request = new NextRequest('http://localhost/api/digest-promotions?date=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid date format. Use YYYY-MM-DD');
  });

  it('returns freeOffers and promotions arrays in response', async () => {
    const request = new NextRequest('http://localhost/api/digest-promotions?date=2026-06-22');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('freeOffers');
    expect(data).toHaveProperty('promotions');
    expect(Array.isArray(data.freeOffers)).toBe(true);
    expect(Array.isArray(data.promotions)).toBe(true);
  });

  it('returns date and total fields in response', async () => {
    const request = new NextRequest('http://localhost/api/digest-promotions?date=2026-06-22');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('date');
    expect(data).toHaveProperty('total');
    expect(data.date).toBe('2026-06-22');
  });

  it('defaults to today date when no date param provided', async () => {
    const request = new NextRequest('http://localhost/api/digest-promotions');
    const response = await GET(request);
    const data = await response.json();

    const today = new Date().toISOString().split('T')[0];
    expect(data.date).toBe(today);
  });
});
