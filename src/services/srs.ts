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

/**
 * Calculates the next review date for an item based on a fixed-stage SRS.
 * @param item The review item to update.
 * @param quality The user's rating of their recall (1: Again, 2: Hard, 3: Good, 4: Easy).
 * @returns An updated ReviewItem with new SRS parameters.
 */
export function calculateNextReview(item: ReviewItem, quality: ReviewQuality): ReviewItem {
    const updatedItem = { ...item };
    let newSrsStage = item.srsStage;

    if (quality === 1) { // "Again" -> Incorrect answer
        updatedItem.incorrectAnswerCount = (item.incorrectAnswerCount || 0) + 1;
        
        // Calculate penalty based on user's formula
        const incorrectAdjustmentCount = Math.ceil(updatedItem.incorrectAnswerCount / 2);
        const srsPenaltyFactor = item.srsStage >= 5 ? 2 : 1;
        const penalty = incorrectAdjustmentCount * srsPenaltyFactor;
        
        // Apply penalty, but don't go below stage 1
        newSrsStage = Math.max(1, item.srsStage - penalty);

    } else { // Correct answer (Hard, Good, Easy)
        // Reset incorrect counter on any successful recall
        updatedItem.incorrectAnswerCount = 0;

        if (quality === 2) { // "Hard" -> Correct, but repeat current stage
            // No change to newSrsStage, it stays the same as item.srsStage
        } else { // "Good" (3) or "Easy" (4) -> Correct, advance stage
            newSrsStage = item.srsStage + 1;
        }
    }

    if (newSrsStage >= 9) {
        // Item is "burned"
        updatedItem.srsStage = 9;
        // Set next review date to a very distant future
        updatedItem.nextReviewDate = new Date('9999-12-31').getTime();
    } else {
        updatedItem.srsStage = newSrsStage;
        const intervalHours = SRS_STAGE_INTERVALS_HOURS[updatedItem.srsStage];
        const now = new Date();
        // Calculate next review time from now
        updatedItem.nextReviewDate = new Date(now.getTime() + intervalHours * 60 * 60 * 1000).getTime();
    }

    return updatedItem;
}