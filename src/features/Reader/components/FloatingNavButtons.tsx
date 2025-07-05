import React from 'react';

export const FloatingNavButtons = ({ isVisible, onNav, sentenceIndex, totalSentences }: { isVisible: boolean, onNav: (dir: 'next' | 'prev') => void, sentenceIndex: number, totalSentences: number }) => (
    <div className={`fixed top-3/4 -translate-y-1/2 left-0 right-0 z-20 pointer-events-none transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full max-w-4xl mx-auto relative h-0">
            <button
                id="reading-nav-prev"
                onClick={() => onNav('prev')}
                disabled={sentenceIndex === 0}
                aria-label="Previous sentence"
                className={`absolute top-0 left-2 md:left-auto md:right-full md:mr-4 w-12 h-12 bg-surface/50 backdrop-blur-sm text-text-primary rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-300 hover:bg-surface/80 disabled:opacity-20 disabled:cursor-not-allowed pointer-events-auto ${isVisible ? 'scale-100' : 'scale-90'}`}
            >
                &larr;
            </button>
            <button
                id="reading-nav-next"
                onClick={() => onNav('next')}
                disabled={sentenceIndex >= totalSentences - 1}
                aria-label="Next sentence"
                className={`absolute top-0 right-2 md:right-auto md:left-full md:ml-4 w-12 h-12 bg-surface/50 backdrop-blur-sm text-text-primary rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-300 hover:bg-surface/80 disabled:opacity-20 disabled:cursor-not-allowed pointer-events-auto ${isVisible ? 'scale-100' : 'scale-90'}`}
            >
                &rarr;
            </button>
        </div>
    </div>
);