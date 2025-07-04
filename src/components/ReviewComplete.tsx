// ui/components/ReviewComplete.tsx
import React from 'react';

interface ReviewCompleteProps {
    learnedCount: number;
    reviewedCount: number;
    onManage: () => void;
    onExit: () => void;
    nextReviewTimestamp: number | null;
}

const formatTimeUntil = (timestamp: number | null): string => {
    if (timestamp === null || !isFinite(timestamp)) {
        return '';
    }
    const now = Date.now();
    const diffMs = timestamp - now;
    
    if (diffMs <= 0) {
        return 'soon';
    }

    const totalMinutes = diffMs / (1000 * 60);
    const totalHours = totalMinutes / 60;
    const totalDays = totalHours / 24;

    if (totalDays >= 2) {
        return `in ${Math.round(totalDays)} days`;
    }
    if (totalDays >= 1) {
        return `tomorrow`;
    }
    if (totalHours >= 2) {
        return `in ${Math.round(totalHours)} hours`;
    }
    if (totalHours >= 1) {
        return `in an hour`;
    }
    if (totalMinutes >= 2) {
        return `in ${Math.round(totalMinutes)} minutes`;
    }
    return `in a minute`;
};

export const ReviewComplete = ({ learnedCount, reviewedCount, onManage, onExit, nextReviewTimestamp }: ReviewCompleteProps) => {
    const total = learnedCount + reviewedCount;
    const hasReviewedAnything = total > 0;
    const nextReviewMessage = formatTimeUntil(nextReviewTimestamp);
    
    return (
        <div className="text-center py-16 px-6 max-w-lg mx-auto">
           <i className="bi bi-check-circle text-6xl text-accent mx-auto mb-6" aria-hidden="true"></i>
           <h2 className="text-2xl font-bold text-text-primary">{hasReviewedAnything ? 'Session Complete!' : 'All Caught Up!'}</h2>
           {hasReviewedAnything ? (
               <div className="mt-2 text-text-secondary space-y-1">
                   <p>Great work! You finished your session for today.</p>
                   <p>You learned <strong className="text-primary">{learnedCount}</strong> new items and reviewed <strong className="text-accent">{reviewedCount}</strong> items.</p>
                   {nextReviewMessage && <p>Your next review is due {nextReviewMessage}.</p>}
               </div>
           ) : (
                <p className="mt-2 text-text-secondary">
                    There are no new words or reviews due right now.
                    {nextReviewMessage && ` Your next review is due ${nextReviewMessage}.`}
                </p>
           )}
           <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
               <button onClick={onExit} className="btn-secondary">Back to Analyzer</button>
               <button onClick={onManage} className="btn-ghost">Manage Deck</button>
           </div>
       </div>
    );
}