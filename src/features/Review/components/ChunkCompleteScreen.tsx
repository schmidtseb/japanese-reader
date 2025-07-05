// src/features/Review/components/ChunkCompleteScreen.tsx
import React from 'react';

interface ChunkCompleteScreenProps {
    onContinue: () => void;
    onExit: () => void;
    hasMoreChunks: boolean;
    hasReviews: boolean;
}

export const ChunkCompleteScreen = ({ onContinue, onExit, hasMoreChunks, hasReviews }: ChunkCompleteScreenProps) => {
    const isFinalStep = !hasMoreChunks && !hasReviews;

    const title = isFinalStep ? "Session Complete!" : "Chunk Complete!";
    const description = isFinalStep
        ? "You've finished all learning and review items for now."
        : "Great work! You've learned this set of items.";
    const buttonText = isFinalStep ? "See Summary" : "Continue";


    return (
        <div className="text-center py-16 px-6 max-w-lg mx-auto flex flex-col h-full justify-center">
            <i className="bi bi-patch-check-fill text-6xl text-accent mx-auto mb-6" aria-hidden="true"></i>
            <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
            <p className="mt-2 text-text-secondary">{description}</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={onExit} className="btn-secondary">
                    Finish for Now
                </button>
                <button onClick={onContinue} className={`btn-primary text-lg ${isFinalStep ? 'px-8 py-3' : ''}`}>
                    {buttonText}
                </button>
            </div>
        </div>
    );
};