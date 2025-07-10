// src/features/Reader/components/ComprehensionQuiz.tsx
import React, { useState } from 'react';

interface QuizData {
    estimated_jlpt_level: string;
    questions: Array<{
        question: string;
        options: string[];
        correct_answer_index: number;
        explanation: string;
    }>;
}

interface ComprehensionQuizProps {
    quizData: QuizData;
    onClose: () => void;
}

export const ComprehensionQuiz: React.FC<ComprehensionQuizProps> = ({ quizData, onClose }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    const currentQuestion = quizData.questions[currentQuestionIndex];

    const handleAnswerSelect = (index: number) => {
        if (selectedAnswerIndex !== null) return;

        setSelectedAnswerIndex(index);
        if (index === currentQuestion.correct_answer_index) {
            setScore(s => s + 1);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < quizData.questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
            setSelectedAnswerIndex(null);
        } else {
            setShowResults(true);
        }
    };

    const renderQuestionView = () => (
        <>
            <div className="text-sm font-semibold text-text-muted mb-2">
                Question {currentQuestionIndex + 1} of {quizData.questions.length}
            </div>
            <p className="text-xl font-medium text-text-primary mb-6 text-center">{currentQuestion.question}</p>
            <div className="w-full space-y-3">
                {currentQuestion.options.map((option, index) => {
                    let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-colors duration-200 disabled:cursor-not-allowed";
                    if (selectedAnswerIndex !== null) {
                        const isCorrect = index === currentQuestion.correct_answer_index;
                        const isSelected = index === selectedAnswerIndex;

                        if (isCorrect) {
                            buttonClass += " bg-accent-subtle-bg border-accent text-accent-text";
                        } else if (isSelected) {
                            buttonClass += " bg-destructive-subtle-bg border-destructive text-destructive-subtle-text";
                        } else {
                             buttonClass += " bg-surface border-border-subtle opacity-60";
                        }
                    } else {
                        buttonClass += " bg-surface border-border hover:bg-surface-hover hover:border-primary";
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleAnswerSelect(index)}
                            disabled={selectedAnswerIndex !== null}
                            className={buttonClass}
                        >
                           <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>{option}
                        </button>
                    );
                })}
            </div>
             {selectedAnswerIndex !== null && (
                <div className="mt-6 w-full animate-fade-in space-y-4">
                    <div className="p-4 bg-surface-soft rounded-lg">
                        <h4 className="font-bold text-accent-text mb-1">Explanation</h4>
                        <p className="text-sm text-text-secondary">{currentQuestion.explanation}</p>
                    </div>
                    <button onClick={handleNextQuestion} className="btn-primary w-full text-lg">
                        {currentQuestionIndex < quizData.questions.length - 1 ? 'Next' : 'Finish Quiz'}
                    </button>
                </div>
            )}
        </>
    );

    const renderResultsView = () => (
        <div className="text-center flex flex-col items-center justify-center h-full">
            <i className="bi bi-award text-6xl text-accent mx-auto mb-4"></i>
            <h2 className="text-2xl font-bold text-text-primary">Quiz Complete!</h2>
            <p className="text-4xl font-bold my-4">
                You scored <span className="text-primary">{score}</span> out of {quizData.questions.length}
            </p>
            <button onClick={onClose} className="btn-secondary mt-6">
                Back to Reading
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                 <header className="flex-shrink-0 p-4 md:p-6 border-b border-border-subtle text-center relative">
                    <button onClick={onClose} className="btn-ghost absolute top-2 right-2 md:top-4 md:right-4" title="Close Quiz">
                        <i className="bi bi-x-lg text-2xl"></i>
                    </button>
                    <div className="text-xs font-semibold uppercase tracking-wider px-2 py-1 bg-primary-subtle-bg text-primary-subtle-text rounded-full inline-block">
                        Text Difficulty: {quizData.estimated_jlpt_level}
                    </div>
                 </header>
                 <main className="flex-grow overflow-y-auto no-scrollbar p-6 md:p-8">
                    {showResults ? renderResultsView() : renderQuestionView()}
                 </main>
            </div>
        </div>
    );
};