// src/features/Review/components/ReviewStart.tsx
import React from 'react';

interface ReviewStartProps {
    newCount: number;
    reviewCount: number;
    onStartLearning: () => void;
    onStartReviewing: () => void;
    onExit: () => void;
}

export const ReviewStart = ({ newCount, reviewCount, onStartLearning, onStartReviewing, onExit }: ReviewStartProps) => {
    const hasNew = newCount > 0;
    const hasReview = reviewCount > 0;

    return (
        <div className="text-center py-6 px-6 max-w-lg mx-auto flex flex-col h-full">
             <div className="w-full flex justify-end mb-4">
                <button data-action="review-exit" onClick={onExit} title="Exit Review Session" className="btn-ghost">
                    <i className="bi bi-x-lg text-2xl"></i>
                </button>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center">
                <i className="bi bi-play-circle text-6xl text-accent mx-auto mb-6" aria-hidden="true"></i>
                <h2 className="text-2xl font-bold text-text-primary">Ready for your session?</h2>
                
                <div className="mt-8 flex flex-col gap-4 w-full max-w-xs">
                    {hasNew && (
                        <button onClick={onStartLearning} className="btn-primary text-lg font-semibold px-8 py-3">
                            Learn {newCount} new item{newCount > 1 ? 's' : ''}
                        </button>
                    )}
                    {hasReview && (
                        <button onClick={onStartReviewing} className={`${hasNew ? 'btn-secondary' : 'btn-primary'} text-lg font-semibold px-8 py-3`}>
                            Review {reviewCount} due item{reviewCount > 1 ? 's' : ''}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};