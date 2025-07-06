// src/features/Review/components/InteractiveWordCard.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as wanakana from 'wanakana';
import { Furigana } from '../../../components/Furigana.tsx';
import { TtsButton } from '../../../components/TtsButton.tsx';
import { ReviewItem } from '../../../contexts/index.ts';
import { WordQuizType } from '../ReviewController.tsx';
import { isSimilar } from '../../../utils/string-similarity.ts';

interface InteractiveWordCardProps {
    item: ReviewItem;
    quizType: WordQuizType;
    onComplete: (isCorrect: boolean) => void;
}

const cardDetails: Record<WordQuizType, {
    questionLabel: string;
    answerPlaceholder: string;
    inputLang: 'en' | 'ja';
    inputMode: 'text' | 'none';
    colorClass: string;
}> = {
    'jp-en': {
        questionLabel: 'Translate to English',
        answerPlaceholder: 'Meaning',
        inputLang: 'en',
        inputMode: 'text',
        colorClass: 'border-review-jp-en',
    },
    'kanji-read': {
        questionLabel: 'What is the reading?',
        answerPlaceholder: 'ひらがな',
        inputLang: 'ja',
        inputMode: 'text',
        colorClass: 'border-review-kanji-read',
    },
};

export const InteractiveWordCard: React.FC<InteractiveWordCardProps> = ({ item, quizType, onComplete }) => {
    // Because the component is re-mounted with a key, these states will always be fresh.
    const [inputValue, setInputValue] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const continueButtonRef = useRef<HTMLButtonElement>(null);

    // This single effect runs on mount and handles focus and Wanakana binding.
    // The cleanup function runs on unmount (triggered by the key change).
    useEffect(() => {
        const inputEl = inputRef.current;
        if (!inputEl) return;

        inputEl.focus();

        if (quizType === 'kanji-read') {
            wanakana.bind(inputEl, { IMEMode: 'toHiragana' });
            return () => {
                wanakana.unbind(inputEl);
            };
        }
    }, [quizType]);

    // Effect to manage focus after an answer is submitted.
    useEffect(() => {
        if (showResult) {
            continueButtonRef.current?.focus();
        }
    }, [showResult]);

    const { content } = item;
    const { questionLabel, answerPlaceholder, inputLang, colorClass } = cardDetails[quizType];

    const questionContent = useMemo(() => {
        return <span className="font-japanese">{content.japanese_segment}</span>;
    }, [content]);

    const checkAnswer = () => {
        const currentVal = inputRef.current?.value || '';
        if (!currentVal.trim()) return;

        setInputValue(currentVal);

        let correct = false;
        switch (quizType) {
            case 'jp-en':
                correct = isSimilar(currentVal, content.english_equivalent);
                break;
            case 'kanji-read':
                const correctReadings = content.reading.split('/').map((r: string) => r.trim());
                correct = correctReadings.includes(currentVal.trim());
                break;
        }
        setIsCorrect(correct);
        setShowResult(true);
    };
    
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showResult) {
                onComplete(isCorrect);
            } else {
                setTimeout(checkAnswer, 0);
            }
        }
    };

    const handleContinueKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onComplete(isCorrect);
        }
    }
    
    const resultBgClass = isCorrect ? 'bg-accent-subtle-bg' : 'bg-destructive-subtle-bg';
    const resultBorderClass = isCorrect ? 'border-accent' : 'border-destructive';
    const resultTextClass = isCorrect ? 'text-accent-text' : 'text-destructive-subtle-text';

    return (
        <div className={`relative w-full flex flex-col justify-center items-center p-6 bg-surface-soft rounded-2xl shadow-lg border-t-4 ${colorClass}`}>
            <div className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider opacity-60" style={{color: `var(--color-review-${quizType}-rgb)`}}>
                {questionLabel}
            </div>

            <div className="text-5xl md:text-7xl font-semibold text-center text-text-primary p-4 mb-4">
                {questionContent}
            </div>

            {!showResult ? (
                <div className="w-full max-w-sm flex flex-col items-center gap-4">
                     <input
                        ref={inputRef}
                        type="text"
                        lang={inputLang}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={answerPlaceholder}
                        className="w-full text-center text-xl p-3 rounded-lg border-2 border-border bg-surface focus:border-primary focus:ring-primary transition"
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                    />
                    <button onClick={checkAnswer} className="btn-secondary px-8 py-2 text-base">Check</button>
                </div>
            ) : (
                <div className={`w-full text-center p-4 rounded-lg border-2 animate-fade-in ${resultBgClass} ${resultBorderClass}`}>
                     <div className="flex justify-center items-center gap-2 mb-4">
                        {isCorrect ? <i className="bi bi-check-circle-fill text-2xl text-accent-text"></i> : <i className="bi bi-x-circle-fill text-2xl text-destructive-subtle-text"></i>}
                        <p className={`text-xl font-bold ${resultTextClass}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</p>
                     </div>

                    <div className="space-y-2">
                        <div className="text-2xl font-japanese font-semibold">
                            <Furigana base={content.japanese_segment} reading={content.reading} />
                            <TtsButton text={content.japanese_segment} />
                        </div>
                        <p className="text-text-secondary text-lg">{content.english_equivalent}</p>
                    </div>
                     {!isCorrect && (
                         <p className="mt-2">Your answer: <span className="font-semibold">{inputValue}</span></p>
                     )}
                     <button ref={continueButtonRef} onKeyDown={handleContinueKeyDown} onClick={() => onComplete(isCorrect)} className="mt-6 w-full btn-primary text-lg">Continue</button>
                </div>
            )}
        </div>
    );
};