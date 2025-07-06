// src/features/Review/components/ReviewCard.tsx
import { useState, useEffect } from 'react';
import { Furigana } from '../../../components/Furigana.tsx';
import { ReviewItem, ReviewQuality } from '../../../contexts/index.ts';
import { WordQuizType } from '../ReviewController.tsx';
import { InteractiveWordCard } from './InteractiveWordCard.tsx';

const ReviewExitButton = ({ onExit }: { onExit: () => void }) => (
    <div className="w-full flex justify-end mb-4">
        <button data-action="review-exit" onClick={onExit} title="Exit Review Session" className="btn-ghost">
            <i className="bi bi-x-lg text-2xl"></i>
        </button>
    </div>
);

const GrammarReviewCard = ({ item, onReview, cardKey }: { item: ReviewItem, onReview: (quality: ReviewQuality) => void, cardKey: number }) => {
    const { content } = item;
    const [showAnswer, setShowAnswer] = useState(false);
    
    // Reset card state when the item prop changes
    useEffect(() => {
        setShowAnswer(false);
    }, [item, cardKey]);

    const { original_sentence, constituent_text, pattern_name, explanation } = content;
    const highlightedSentence = (original_sentence && constituent_text)
        ? original_sentence.replace(constituent_text, `<span class="bg-accent-subtle-bg text-accent-text px-2 py-1 rounded">${constituent_text}</span>`)
        : pattern_name;
    
    const frontHTML = <div className="text-2xl md:text-3xl font-japanese font-medium text-center text-text-primary p-8 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightedSentence }} />;
    
    const backHTML = (
        <div className="text-center space-y-6">
            <div
                className="text-xl md:text-2xl font-japanese font-medium text-text-primary leading-relaxed p-4 bg-surface rounded-xl border border-border-subtle"
                dangerouslySetInnerHTML={{ __html: highlightedSentence }}
            />
            <div>
                <div className="text-3xl font-japanese font-semibold mb-2 text-accent">{pattern_name}</div>
                <p className="text-lg text-text-secondary">{explanation}</p>
            </div>
        </div>
    );

    return (
        <>
            <div className="relative w-full min-h-[20rem] flex flex-col justify-center items-center p-6 bg-surface-soft rounded-2xl shadow-lg">
                {!showAnswer ? frontHTML : backHTML}
            </div>
            {showAnswer ? (
                <div className="mt-8 w-full">
                    <div>
                        <p className="text-center text-text-muted mb-4 text-sm">How well did you remember?</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                            <button onClick={() => onReview(1)} data-action="review-quality-1" className="text-lg font-bold py-4 px-4 rounded-xl bg-destructive-subtle-bg text-destructive-subtle-text hover:bg-destructive-subtle-bg/80 focus-ring transition">Again <span className="text-xs font-normal">(1)</span></button>
                            <button onClick={() => onReview(2)} data-action="review-quality-2" className="text-lg font-bold py-4 px-4 rounded-xl bg-pos-auxiliary-bg text-pos-auxiliary-text hover:opacity-80 focus-ring transition">Hard <span className="text-xs font-normal">(2)</span></button>
                            <button onClick={() => onReview(3)} data-action="review-quality-3" className="text-lg font-bold py-4 px-4 rounded-xl bg-surface-hover text-text-secondary hover:bg-surface-hover/80 focus-ring transition">Good <span className="text-xs font-normal">(3)</span></button>
                            <button onClick={() => onReview(4)} data-action="review-quality-4" className="text-lg font-bold py-4 px-4 rounded-xl bg-accent-subtle-bg text-accent-text hover:bg-accent-subtle-bg/80 focus-ring transition">Easy <span className="text-xs font-normal">(4)</span></button>
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
        </>
    );
};


interface ReviewCardProps {
    item: ReviewItem;
    quizType?: WordQuizType;
    onReview: (isCorrectOrQuality: ReviewQuality | boolean) => void;
    onExit: () => void;
    cardKey: number;
}

export const ReviewCard = ({ item, quizType, onReview, onExit, cardKey }: ReviewCardProps) => {
    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4">
            <ReviewExitButton onExit={onExit} />
            {item.type === 'word' && quizType ? (
                 <InteractiveWordCard 
                    key={cardKey}
                    item={item} 
                    quizType={quizType}
                    onComplete={(isCorrect) => onReview(isCorrect)} 
                />
            ) : (
                <GrammarReviewCard key={cardKey} item={item} onReview={(quality) => onReview(quality)} cardKey={cardKey} />
            )}
        </div>
    );
};