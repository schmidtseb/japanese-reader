// src/features/Review/components/LearningQuizCard.tsx
import { useState, useEffect } from 'react';
import { Furigana } from '../../../components/Furigana.tsx';
import { ReviewItem } from '../../../contexts/index.ts';

const CardContent = ({ item, isAnswerShown }: { item: ReviewItem, isAnswerShown: boolean }) => {
    if (item.type === 'word') {
        const { japanese_segment, english_equivalent, reading } = item.content;
        return (
            <div className="text-center">
                <div className="text-5xl md:text-7xl font-japanese font-semibold text-center text-text-primary mb-8">{japanese_segment}</div>
                {isAnswerShown && (
                    <div className="animate-fade-in">
                        <div className="text-3xl font-japanese font-semibold mb-4 pb-4 border-b border-border-subtle">
                            <Furigana base={japanese_segment} reading={reading || ''} />
                        </div>
                        <div className="text-lg text-text-secondary">{english_equivalent}</div>
                    </div>
                )}
            </div>
        );
    } else { // grammar
        const { original_sentence, constituent_text, pattern_name, explanation } = item.content;
        const highlightedSentence = (original_sentence && constituent_text)
            ? original_sentence.replace(constituent_text, `<span class="bg-accent-subtle-bg text-accent-text px-2 py-1 rounded">${constituent_text}</span>`)
            : pattern_name;
            
        return (
            <div className="text-center">
                <div className="text-2xl md:text-3xl font-japanese font-medium text-center text-text-primary p-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightedSentence }} />
                {isAnswerShown && (
                     <div className="animate-fade-in mt-6">
                        <div className="text-3xl font-japanese font-semibold mb-4 text-accent">{pattern_name}</div>
                        <p className="text-lg text-text-secondary">{explanation}</p>
                    </div>
                )}
            </div>
        )
    }
}

export const LearningQuizCard = ({ item, onExit, onAnswer, remainingCount }: { item: ReviewItem, onExit: () => void, onAnswer: (item: ReviewItem, remembered: boolean) => void, remainingCount: number }) => {
    const [showAnswer, setShowAnswer] = useState(false);

    useEffect(() => {
        setShowAnswer(false);
    }, [item]);

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4">
             <div className="w-full flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-text-muted px-3 py-1 bg-surface rounded-full">{remainingCount} items left</span>
                <button onClick={onExit} title="Exit Review Session" className="btn-ghost">
                    <i className="bi bi-x-lg text-2xl"></i>
                </button>
            </div>
            <div className="relative w-full min-h-[20rem] flex flex-col justify-center items-center p-6 bg-surface-soft rounded-2xl shadow-lg">
                <CardContent item={item} isAnswerShown={showAnswer}/>
            </div>
            {showAnswer ? (
                <div className="mt-8 w-full">
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => onAnswer(item, false)} className="text-lg font-bold py-4 px-4 rounded-xl bg-destructive-subtle-bg text-destructive-subtle-text hover:bg-destructive-subtle-bg/80 focus-ring transition">
                        <i className="bi bi-arrow-counterclockwise mr-2"></i> I Forgot
                        </button>
                        <button onClick={() => onAnswer(item, true)} className="text-lg font-bold py-4 px-4 rounded-xl bg-accent-subtle-bg text-accent-text hover:bg-accent-subtle-bg/80 focus-ring transition">
                            <i className="bi bi-check-lg mr-2"></i> I Remembered
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-8 w-full flex items-center">
                    <button onClick={() => setShowAnswer(true)} className="w-full max-w-xs mx-auto btn-primary text-lg">
                        Show Answer
                    </button>
                </div>
            )}
        </div>
    );
};