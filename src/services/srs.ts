// services/srs.ts
import { ReviewItem, ReviewQuality } from '../contexts/index.ts';

// SRS stages and their corresponding review intervals in hours.
// Stage 0 is for new items. Stage 9 is for burned items.
const SRS_STAGE_INTERVALS_HOURS = [
    0,      // Stage 0 (New item) - Should be handled by learning queue
    4,      // Stage 1: 4 hours
    8,      // Stage 2: 8 hours
    24,     // Stage 3: 1 day
    48,     // Stage 4: 2 days
    168,    // Stage 5: 1 week
    336,    // Stage 6: 2 weeks
    720,    // Stage 7: 1 month (30 days)
    2880,   // Stage 8: 4 months (120 days)
];

const DEFAULT_INTERVAL_MODIFIER = 1.0;
const MIN_INTERVAL_MODIFIER = 0.5;
const MAX_INTERVAL_MODIFIER = 2.5;
const MODIFIER_EASY_BUMP = 0.15;
const MODIFIER_HARD_PENALTY = 0.15;
const MODIFIER_AGAIN_PENALTY = 0.20;


/**
 * Calculates the next review date for an item based on a dynamic, performance-adjusted SRS.
 * @param item The review item to update.
 * @param quality The user's rating of their recall (1: Again, 2: Hard, 3: Good, 4: Easy).
 * @returns An updated ReviewItem with new SRS parameters.
 */
export function calculateNextReview(item: ReviewItem, quality: ReviewQuality): ReviewItem {
    const updatedItem = { ...item };
    let newSrsStage = item.srsStage;
    
    // Initialize intervalModifier for backward compatibility with items that don't have it.
    let newIntervalModifier = item.intervalModifier ?? DEFAULT_INTERVAL_MODIFIER;

    if (quality === 1) { // "Again" -> Incorrect answer
        updatedItem.incorrectAnswerCount = (item.incorrectAnswerCount || 0) + 1;
        
        // Retain the existing stage penalty logic
        const incorrectAdjustmentCount = Math.ceil(updatedItem.incorrectAnswerCount / 2);
        const srsPenaltyFactor = item.srsStage >= 5 ? 2 : 1;
        const penalty = incorrectAdjustmentCount * srsPenaltyFactor;
        newSrsStage = Math.max(1, item.srsStage - penalty);

        // Adjust interval modifier downwards for incorrect answers
        newIntervalModifier -= MODIFIER_AGAIN_PENALTY;

    } else { // Correct answer (Hard, Good, Easy)
        // Reset incorrect counter on any successful recall
        updatedItem.incorrectAnswerCount = 0;

        if (quality === 2) { // "Hard"
            // Stage does not advance, but the interval modifier is reduced,
            // making the next review for this stage sooner.
            newIntervalModifier -= MODIFIER_HARD_PENALTY;
        } else if (quality === 3) { // "Good"
            // Stage advances, modifier is unchanged. Standard progression.
            newSrsStage = item.srsStage + 1;
        } else { // "Easy" (4)
            // Stage advances and modifier increases, pushing the next review further out.
            newIntervalModifier += MODIFIER_EASY_BUMP;
            newSrsStage = item.srsStage + 1;
        }
    }
    
    // Clamp the modifier to prevent extreme values.
    updatedItem.intervalModifier = Math.max(MIN_INTERVAL_MODIFIER, Math.min(newIntervalModifier, MAX_INTERVAL_MODIFIER));

    if (newSrsStage >= 9) {
        // Item is "burned"
        updatedItem.srsStage = 9;
        updatedItem.nextReviewDate = new Date('9999-12-31').getTime();
    } else {
        updatedItem.srsStage = newSrsStage;
        const baseIntervalHours = SRS_STAGE_INTERVALS_HOURS[updatedItem.srsStage];
        // The core of the dynamic system: apply the modifier to the base interval.
        const modifiedIntervalHours = baseIntervalHours * updatedItem.intervalModifier;
        
        const now = new Date();
        updatedItem.nextReviewDate = new Date(now.getTime() + modifiedIntervalHours * 60 * 60 * 1000).getTime();
    }

    return updatedItem;
}