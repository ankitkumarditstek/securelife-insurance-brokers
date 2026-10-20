import { describe, it, expect } from 'vitest';
import {
  getStatusBadgeConfig,
  getTierBadgeConfig,
  STATUS_STYLES,
  TIER_STYLES,
} from '../../../utils/statusStyles';

describe('statusStyles utility', () => {
  it('returns configured style for defined status keys', () => {
    const qualified = getStatusBadgeConfig('qualified');
    expect(qualified.label).toBe('Qualified Lead');
    expect(qualified.badgeText).toContain('text-emerald-400');

    const underReview = getStatusBadgeConfig('under_review');
    expect(underReview.label).toBe('Under Review');
    expect(underReview.badgeText).toContain('text-purple-400');

    const closedWon = getStatusBadgeConfig('closed_won');
    expect(closedWon.label).toBe('Closed Won');
  });

  it('provides safe fallback styling for unknown or custom statuses', () => {
    const unknown = getStatusBadgeConfig('custom_pipeline_status');
    expect(unknown.key).toBe('custom_pipeline_status');
    expect(unknown.label).toBe('custom pipeline status');
    expect(unknown.badgeBg).toBe('bg-slate-800/60');
  });

  it('returns correct tier styles by tier name', () => {
    expect(getTierBadgeConfig('hot').tier).toBe('hot');
    expect(getTierBadgeConfig('warm').tier).toBe('warm');
    expect(getTierBadgeConfig('cold').tier).toBe('cold');
  });

  it('infers tier correctly from numerical scores when tier is missing', () => {
    expect(getTierBadgeConfig(null, 85).tier).toBe('hot');
    expect(getTierBadgeConfig(null, 80).tier).toBe('hot');
    expect(getTierBadgeConfig(null, 65).tier).toBe('warm');
    expect(getTierBadgeConfig(null, 50).tier).toBe('warm');
    expect(getTierBadgeConfig(null, 40).tier).toBe('cold');
    expect(getTierBadgeConfig(null, 0).tier).toBe('cold');
    expect(getTierBadgeConfig(null, null).tier).toBe('unscored');
  });

  it('includes all 10 standard CRM statuses in STATUS_STYLES', () => {
    const expectedKeys = [
      'new',
      'in_conversation',
      'qualified',
      'documents_pending',
      'documents_processing',
      'under_review',
      'analysis_complete',
      'closed_won',
      'closed_lost',
      'disqualified',
    ];
    for (const key of expectedKeys) {
      expect(STATUS_STYLES[key]).toBeDefined();
      expect(STATUS_STYLES[key].label).toBeTruthy();
    }
  });

  it('includes hot, warm, cold, unscored in TIER_STYLES', () => {
    expect(TIER_STYLES.hot).toBeDefined();
    expect(TIER_STYLES.warm).toBeDefined();
    expect(TIER_STYLES.cold).toBeDefined();
    expect(TIER_STYLES.unscored).toBeDefined();
  });
});
