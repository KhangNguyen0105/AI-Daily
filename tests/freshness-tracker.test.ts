import { describe, it, expect, vi } from 'vitest';
import {
  computeDataAge,
  computeFreshnessStatus,
  computeFreshnessConfidence,
  getFreshnessBadge,
  checkSLABreach,
  computeFreshnessMetadata,
  isWarningThreshold,
  isExcludedFromRankings,
  SLA_TIERS,
} from '../src/lib/freshness-tracker';

describe('computeDataAge', () => {
  it('returns 0 for current timestamp', () => {
    const now = new Date();
    expect(computeDataAge(now)).toBeLessThanOrEqual(1);
  });

  it('returns correct minutes for 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const age = computeDataAge(oneHourAgo);
    expect(age).toBeGreaterThanOrEqual(59);
    expect(age).toBeLessThanOrEqual(61);
  });

  it('returns correct minutes for 24 hours ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const age = computeDataAge(oneDayAgo);
    expect(age).toBeGreaterThanOrEqual(1439);
    expect(age).toBeLessThanOrEqual(1441);
  });
});

describe('computeFreshnessStatus', () => {
  it('returns fresh for <24h (0-1439 min)', () => {
    expect(computeFreshnessStatus(0)).toBe('fresh');
    expect(computeFreshnessStatus(60)).toBe('fresh');       // 1 hour
    expect(computeFreshnessStatus(1439)).toBe('fresh');     // 23h59m
  });

  it('returns recent for 24-72h', () => {
    expect(computeFreshnessStatus(1440)).toBe('recent');    // 24h
    expect(computeFreshnessStatus(2880)).toBe('recent');    // 48h
    expect(computeFreshnessStatus(4319)).toBe('recent');    // 71h59m
  });

  it('returns aging for 3-7d', () => {
    expect(computeFreshnessStatus(4320)).toBe('aging');     // 72h
    expect(computeFreshnessStatus(7200)).toBe('aging');     // 5d
    expect(computeFreshnessStatus(10079)).toBe('aging');    // 6d23h59m
  });

  it('returns stale for >7d', () => {
    expect(computeFreshnessStatus(10080)).toBe('stale');    // 7d
    expect(computeFreshnessStatus(20160)).toBe('stale');    // 14d
    expect(computeFreshnessStatus(43200)).toBe('stale');    // 30d
  });
});

describe('computeFreshnessConfidence', () => {
  it('returns 90 for <24h', () => {
    expect(computeFreshnessConfidence(0)).toBe(90);
    expect(computeFreshnessConfidence(1439)).toBe(90);
  });

  it('returns 70 for 24-72h', () => {
    expect(computeFreshnessConfidence(1440)).toBe(70);
    expect(computeFreshnessConfidence(4319)).toBe(70);
  });

  it('returns 40 for 3-7d', () => {
    expect(computeFreshnessConfidence(4320)).toBe(40);
    expect(computeFreshnessConfidence(10079)).toBe(40);
  });

  it('returns 20 for 7-14d', () => {
    expect(computeFreshnessConfidence(10080)).toBe(20);
    expect(computeFreshnessConfidence(335 * 60)).toBe(20);
  });

  it('returns 10 for >14d', () => {
    expect(computeFreshnessConfidence(336 * 60)).toBe(10);
    expect(computeFreshnessConfidence(720 * 60)).toBe(10);
  });
});

describe('getFreshnessBadge', () => {
  it('fresh -> green', () => {
    const badge = getFreshnessBadge('fresh');
    expect(badge.badge_color).toBe('green');
    expect(badge.display_text).toBe('Fresh');
  });

  it('recent -> blue', () => {
    const badge = getFreshnessBadge('recent');
    expect(badge.badge_color).toBe('blue');
    expect(badge.display_text).toBe('Recent');
  });

  it('aging -> amber', () => {
    const badge = getFreshnessBadge('aging');
    expect(badge.badge_color).toBe('amber');
    expect(badge.display_text).toBe('Aging');
  });

  it('stale -> red', () => {
    const badge = getFreshnessBadge('stale');
    expect(badge.badge_color).toBe('red');
    expect(badge.display_text).toBe('Stale');
  });
});

describe('SLA_TIERS', () => {
  it('tier1: crawl every 4h, stale >24h', () => {
    expect(SLA_TIERS.tier1.crawl_frequency_hours).toBe(4);
    expect(SLA_TIERS.tier1.freshness_sla_hours).toBe(24);
  });

  it('tier2: crawl every 12h, stale >48h', () => {
    expect(SLA_TIERS.tier2.crawl_frequency_hours).toBe(12);
    expect(SLA_TIERS.tier2.freshness_sla_hours).toBe(48);
  });

  it('tier3: crawl daily, stale >7d (168h)', () => {
    expect(SLA_TIERS.tier3.crawl_frequency_hours).toBe(24);
    expect(SLA_TIERS.tier3.freshness_sla_hours).toBe(168);
  });

  it('all tiers: warning at 14d, exclusion at 30d', () => {
    for (const tier of ['tier1', 'tier2', 'tier3'] as const) {
      expect(SLA_TIERS[tier].warning_threshold_hours).toBe(336);
      expect(SLA_TIERS[tier].exclusion_threshold_hours).toBe(720);
    }
  });
});

describe('checkSLABreach', () => {
  it('tier1: no breach at 12h', async () => {
    const result = await checkSLABreach(12 * 60, 'tier1');
    expect(result.breached).toBe(false);
    expect(result.daysOverdue).toBe(0);
    expect(result.requiresRecrawl).toBe(false);
  });

  it('tier1: breach at 25h (1h overdue)', async () => {
    const result = await checkSLABreach(25 * 60, 'tier1');
    expect(result.breached).toBe(true);
    expect(result.daysOverdue).toBe(1);
    expect(result.requiresRecrawl).toBe(true);
  });

  it('tier2: no breach at 24h', async () => {
    const result = await checkSLABreach(24 * 60, 'tier2');
    expect(result.breached).toBe(false);
  });

  it('tier2: breach at 49h', async () => {
    const result = await checkSLABreach(49 * 60, 'tier2');
    expect(result.breached).toBe(true);
    expect(result.requiresRecrawl).toBe(true);
  });

  it('tier3: no breach at 48h', async () => {
    const result = await checkSLABreach(48 * 60, 'tier3');
    expect(result.breached).toBe(false);
  });

  it('tier3: breach at 169h (7d+1h)', async () => {
    const result = await checkSLABreach(169 * 60, 'tier3');
    expect(result.breached).toBe(true);
    expect(result.requiresRecrawl).toBe(true);
  });

  it('tier1: significant breach at 48h (1d overdue)', async () => {
    const result = await checkSLABreach(48 * 60, 'tier1');
    expect(result.breached).toBe(true);
    expect(result.daysOverdue).toBe(1);
  });
});

describe('computeFreshnessMetadata', () => {
  it('recent extraction has fresh status', async () => {
    const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const metadata = await computeFreshnessMetadata(recentTime, 'tier1');
    expect(metadata.freshness_status).toBe('fresh');
    expect(metadata.sla_breach).toBe(false);
    expect(metadata.data_age_minutes).toBeGreaterThanOrEqual(29);
    expect(metadata.data_age_minutes).toBeLessThanOrEqual(31);
  });

  it('old extraction has stale status and SLA breach for tier1', async () => {
    const oldTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const metadata = await computeFreshnessMetadata(oldTime, 'tier1');
    expect(metadata.freshness_status).toBe('stale');
    expect(metadata.sla_breach).toBe(true);
    expect(metadata.sla_days_overdue).toBeGreaterThanOrEqual(1);
  });

  it('tier2 extraction not breached at 36h', async () => {
    const time36h = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const metadata = await computeFreshnessMetadata(time36h, 'tier2');
    expect(metadata.freshness_status).toBe('recent');
    expect(metadata.sla_breach).toBe(false);
  });
});

describe('isWarningThreshold', () => {
  it('returns false for <14d', () => {
    expect(isWarningThreshold(335 * 60)).toBe(false);
  });

  it('returns true for >14d', () => {
    expect(isWarningThreshold(337 * 60)).toBe(true);
  });
});

describe('isExcludedFromRankings', () => {
  it('returns false for <30d', () => {
    expect(isExcludedFromRankings(719 * 60)).toBe(false);
  });

  it('returns true for >30d', () => {
    expect(isExcludedFromRankings(721 * 60)).toBe(true);
  });
});
