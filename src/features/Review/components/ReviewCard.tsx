// src/features/Review/components/ReviewCard.tsx
import { useState, useEffect } from 'react';
import { Furigana } from '../../../components/Furigana.tsx';
import { ReviewItem, ReviewQuality } from '../../../contexts/index.ts';

const ReviewExitButton = ({ onExit }: { onExit: () => void }) => (
    <div className="w-full flex justify-end mb-4">
        <button data-action="review-exit" onClick={onExit} title="Exit Review Session" className="btn-ghost">
            <i className="bi bi-x-lg text-2xl"></i>
        </button>
    </div>
);

interface ReviewCardProps {
    item: ReviewItem;
    onReview: (quality: ReviewQuality) => void;
    onExit: () => void;
}

export const ReviewCard = ({ item, onReview, onExit }: ReviewCardProps) => {
    const { type, content } = item;
    const [showAnswer, setShowAnswer] = useState(false);

    // Reset card state when the item prop changes
    useEffect(() => {
        setShowAnswer(false);
    }, [item]);
    
    let frontHTML, backHTML;

    if (type === 'word') {
        frontHTML = <div className="text-5xl md:text-7xl font-japanese font-semibold text-center text-text-primary p-8">{content.japanese_segment}</div>;
        backHTML = (
            <div className="text-center">
                <div className="text-3xl font-japanese font-semibold mb-4 pb-4 border-b border-border-subtle">
                    <Furigana base={content.japanese_segment} reading={content.reading || ''} />
                </div>
                <div className="text-lg text-text-secondary mb-6">{content.english_equivalent}</div>
                <div className="text-sm space-y-2 text-text-muted">
                    <p><strong className="font-medium text-text-secondary">Category:</strong> {content.category.replace(/_/g, ' ').replace(/-/g, ', ')}</p>
                    <p><strong className="font-medium text-text-secondary">Reading:</strong> {content.reading}</p>
                </div>
            </div>
        );
    } else { // grammar
        const { original_sentence, constituent_text, pattern_name, explanation } = content;
        const highlightedSentence = (original_sentence && constituent_text)
            ? original_sentence.replace(constituent_text, `<span class="bg-accent-subtle-bg text-accent-text px-2 py-1 rounded">${constituent_text}</span>`)
            : pattern_name;
        
        frontHTML = <div className="text-2xl md:text-3xl font-japanese font-medium text-center text-text-primary p-8 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightedSentence }} />;
        backHTML = (
            <div className="text-center">
                <div className="text-3xl font-japanese font-semibold mb-4 text-accent">{pattern_name}</div>
                <p className="text-lg text-text-secondary">{explanation}</p>
            </div>
        );
    }

    const handleGrade = (quality: ReviewQuality) => {
        onReview(quality);
        setShowAnswer(false); // This will be handled by the parent re-rendering with a new item
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4">
            <ReviewExitButton onExit={onExit} />
            <div className="relative w-full min-h-[20rem] flex flex-col justify-center items-center p-6 bg-surface-soft rounded-2xl shadow-lg">
                {!showAnswer ? frontHTML : backHTML}
            </div>
            {showAnswer ? (
                <div className="mt-8 w-full">
                    <div>
                        <p className="text-center text-text-muted mb-4 text-sm">How well did you remember?</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                            <button onClick={() => handleGrade(1)} data-action="review-quality-1" className="text-lg font-bold py-4 px-4 rounded-xl bg-destructive-subtle-bg text-destructive-subtle-text hover:bg-destructive-subtle-bg/80 focus-ring transition">Again <span className="text-xs font-normal">(1)</span></button>
                            <button onClick={() => handleGrade(2)} data-action="review-quality-2" className="text-lg font-bold py-4 px-4 rounded-xl bg-pos-auxiliary-bg text-pos-auxiliary-text hover:opacity-80 focus-ring transition">Hard <span className="text-xs font-normal">(2)</span></button>
                            <button onClick={() => handleGrade(3)} data-action="review-quality-3" className="text-lg font-bold py-4 px-4 rounded-xl bg-surface-hover text-text-secondary hover:bg-surface-hover/80 focus-ring transition">Good <span className="text-xs font-normal">(3)</span></button>
                            <button onClick={() => handleGrade(4)} data-action="review-quality-4" className="text-lg font-bold py-4 px-4 rounded-xl bg-accent-subtle-bg text-accent-text hover:bg-accent-subtle-bg/80 focus-ring transition">Easy <span className="text-xs font-normal">(4)</span></button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-8 w-full flex items-center">
                    <button onClick={() => setShowAnswer(true)} data-action="review-show-answer" className="w-full max-w-xs mx-auto btn-primary text-lg">
                        Show Answer <span className="text-sm font-normal text-primary-text/80 ml-2">(Space)</span>
                    </button>
                </div>
            )}
        </div>
    );
};