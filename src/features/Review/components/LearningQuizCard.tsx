// src/features/Review/components/LearningQuizCard.tsx
import React, { useState, useEffect } from 'react';
import { ReviewItem } from '../../../contexts/index.ts';
import { WordQuizType } from '../ReviewController.tsx';
import { InteractiveWordCard } from './InteractiveWordCard.tsx';

interface LearningQuizCardProps {
    quizQuestion: { item: ReviewItem; quizType?: WordQuizType };
    onExit: () => void;
    onAnswer: (quizQuestion: { item: ReviewItem; quizType?: WordQuizType }, remembered: boolean) => void;
    remainingCount: number;
    cardKey: number;
}

const GrammarQuiz = ({ item, onAnswer, cardKey }: { item: ReviewItem, onAnswer: (remembered: boolean) => void, cardKey: number }) => {
    const [showAnswer, setShowAnswer] = useState(false);

    useEffect(() => {
        setShowAnswer(false);
    }, [item, cardKey]);

    const { content } = item;
    const { original_sentence, constituent_text, pattern_name, explanation } = content;
    const highlightedSentence = (original_sentence && constituent_text)
        ? original_sentence.replace(constituent_text, `<strong class="text-accent-text">${constituent_text}</strong>`)
        : pattern_name;
    
    const frontContent = (
        <div className="text-xl md:text-2xl font-japanese font-medium text-center text-text-primary p-4 leading-relaxed">
            <p className="mb-2 text-sm text-text-muted">In sentence:</p>
            <div dangerouslySetInnerHTML={{ __html: highlightedSentence }} />
            <p className="mt-6 text-base text-text-secondary">What does <strong className="text-accent-text">{pattern_name}</strong> mean?</p>
        </div>
    );
    
    const backContent = (
        <div className="text-center space-y-4">
            <div 
                className="text-lg font-japanese text-text-primary p-4 leading-relaxed bg-surface rounded-md border border-border-subtle"
                dangerouslySetInnerHTML={{ __html: highlightedSentence }}
            />
            <div>
                <div className="text-2xl font-japanese font-semibold mb-2 text-accent">{pattern_name}</div>
                <p className="text-base text-text-secondary">{explanation}</p>
            </div>
        </div>
    );

    return (
        <div className="w-full flex flex-col items-center">
            <div className="relative w-full min-h-[15rem] flex flex-col justify-center items-center p-6 bg-surface-soft rounded-2xl shadow-lg border-t-4 border-pos-conjunction-bg/50">
                {!showAnswer ? frontContent : backContent}
            </div>
            <div className="mt-6 w-full max-w-sm">
                {showAnswer ? (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => onAnswer(false)} className="text-lg font-bold py-3 px-4 rounded-xl bg-destructive-subtle-bg text-destructive-subtle-text hover:bg-destructive-subtle-bg/80 focus-ring transition">Forgot</button>
                        <button onClick={() => onAnswer(true)} className="text-lg font-bold py-3 px-4 rounded-xl bg-accent-subtle-bg text-accent-text hover:bg-accent-subtle-bg/80 focus-ring transition">Remembered</button>
                    </div>
                ) : (
                    <button onClick={() => setShowAnswer(true)} className="w-full btn-primary text-lg">
                        Show Answer
                    </button>
                )}
            </div>
        </div>
    );
};

export const LearningQuizCard = ({ quizQuestion, onExit, onAnswer, remainingCount, cardKey }: LearningQuizCardProps) => {
    const { item, quizType } = quizQuestion;

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4">
             <div className="w-full flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-text-muted px-3 py-1 bg-surface rounded-full">{remainingCount} to go</span>
                <button onClick={onExit} title="Exit Review Session" className="btn-ghost">
                    <i className="bi bi-x-lg text-2xl"></i>
                </button>
            </div>
            {quizType ? (
                <InteractiveWordCard
                    key={cardKey}
                    item={item}
                    quizType={quizType}
                    onComplete={(remembered) => onAnswer(quizQuestion, remembered)}
                />
            ) : (
                <GrammarQuiz key={cardKey} item={item} onAnswer={(remembered) => onAnswer(quizQuestion, remembered)} cardKey={cardKey} />
            )}
        </div>
    );
};