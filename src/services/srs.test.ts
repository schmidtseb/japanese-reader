import { describe, it, expect, beforeEach } from 'vitest';
import { calculateNextReview } from './srs';
import { ReviewItem } from '../contexts';

const DEFAULT_INTERVAL_MODIFIER = 1.0;
const MODIFIER_EASY_BUMP = 0.15;
const MODIFIER_HARD_PENALTY = 0.15;
const MODIFIER_AGAIN_PENALTY = 0.20;

describe('calculateNextReview', () => {
  let baseItem: ReviewItem;

  beforeEach(() => {
    baseItem = {
      id: 'test-item',
      type: 'word',
      content: {},
      srsStage: 2,
      incorrectAnswerCount: 0,
      nextReviewDate: new Date().getTime(),
      addedAt: new Date().getTime(),
      intervalModifier: 1.0,
    };
  });

  it('should advance stage and not change modifier on "Good" (3)', () => {
    const item: ReviewItem = { ...baseItem, srsStage: 2, incorrectAnswerCount: 3, intervalModifier: 1.2 };
    const result = calculateNextReview(item, 3);
    expect(result.srsStage).toBe(3);
    expect(result.incorrectAnswerCount).toBe(0);
    expect(result.intervalModifier).toBeCloseTo(1.2);
    expect(result.nextReviewDate).toBeGreaterThan(baseItem.nextReviewDate);
  });

  it('should advance stage and increase modifier on "Easy" (4)', () => {
    const item: ReviewItem = { ...baseItem, srsStage: 4, incorrectAnswerCount: 1 };
    const result = calculateNextReview(item, 4);
    expect(result.srsStage).toBe(5);
    expect(result.incorrectAnswerCount).toBe(0);
    expect(result.intervalModifier).toBeCloseTo(DEFAULT_INTERVAL_MODIFIER + MODIFIER_EASY_BUMP);
  });

  it('should not advance stage and decrease modifier on "Hard" (2)', () => {
    const item: ReviewItem = { ...baseItem, srsStage: 3 };
    const result = calculateNextReview(item, 2);
    expect(result.srsStage).toBe(3);
    expect(result.intervalModifier).toBeCloseTo(DEFAULT_INTERVAL_MODIFIER - MODIFIER_HARD_PENALTY);
    expect(result.nextReviewDate).toBeGreaterThan(baseItem.nextReviewDate);
  });

  it('should demote stage and decrease modifier on "Again" (1)', () => {
    const item: ReviewItem = { ...baseItem, srsStage: 4, incorrectAnswerCount: 0 };
    const result = calculateNextReview(item, 1);
    expect(result.srsStage).toBe(3); // Penalty for stage < 5 is ceil(1/2)=1, so 4-1=3
    expect(result.incorrectAnswerCount).toBe(1);
    expect(result.intervalModifier).toBeCloseTo(DEFAULT_INTERVAL_MODIFIER - MODIFIER_AGAIN_PENALTY);
  });

  it('should apply a larger penalty for stages >= 5 on "Again" (1)', () => {
    const item: ReviewItem = { ...baseItem, srsStage: 6, incorrectAnswerCount: 2 };
    const result = calculateNextReview(item, 1);
    expect(result.incorrectAnswerCount).toBe(3);
    // penalty = ceil(3/2) * 2 = 2 * 2 = 4
    expect(result.srsStage).toBe(2); // 6 - 4 = 2
  });

  it('should not demote below stage 1', () => {
    const item: ReviewItem = { ...baseItem, srsStage: 1, incorrectAnswerCount: 10 };
    const result = calculateNextReview(item, 1);
    expect(result.srsStage).toBe(1);
  });

  it('should "burn" an item when it advances past the last stage', () => {
    const item: ReviewItem = { ...baseItem, srsStage: 8 };
    const result = calculateNextReview(item, 4); // "Easy" on stage 8 advances to stage 9
    expect(result.srsStage).toBe(9);
    expect(result.nextReviewDate).toBe(new Date('9999-12-31').getTime());
  });

  it('should handle items without an existing intervalModifier (backward compatibility)', () => {
    const oldItem: Omit<ReviewItem, 'intervalModifier'> & { intervalModifier?: number } = { ...baseItem };
    delete oldItem.intervalModifier;
    
    const result = calculateNextReview(oldItem as ReviewItem, 4); // "Easy"
    expect(result.srsStage).toBe(3);
    expect(result.intervalModifier).toBeCloseTo(DEFAULT_INTERVAL_MODIFIER + MODIFIER_EASY_BUMP);
  });
});