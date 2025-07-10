// src/components/WordDetails.tsx
import React, { useEffect } from 'react';
import { useGetWordDetails } from '../services/gemini';
import { ErrorComponent } from './ErrorComponent';
import { Furigana } from './Furigana';

interface WordDetailsProps {
    word: string;
    reading: string;
    onBack: () => void;
}

export const WordDetails: React.FC<WordDetailsProps> = ({ word, reading, onBack }) => {
    const { data, isLoading, error, execute } = useGetWordDetails();

    useEffect(() => {
        execute(word, reading);
    }, [word, reading, execute]);

    const handleRetry = () => {
        execute(word, reading);
    }

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center p-8 min-h-[200px]">
                <i className="bi bi-arrow-repeat text-3xl text-text-muted animate-spin"></i>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-2">
                <div className="flex justify-end">
                    <button onClick={onBack} className="btn-ghost" title="Back to quick info">
                        <i className="bi bi-arrow-left"></i> Back
                    </button>
                </div>
                <ErrorComponent error={error} onRetry={handleRetry} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-4 text-center text-text-muted">
                <div className="flex justify-end">
                    <button onClick={onBack} className="btn-ghost" title="Back to quick info">
                        <i className="bi bi-arrow-left"></i> Back
                    </button>
                </div>
                <p>No details found for this word.</p>
            </div>
        );
    }

    return (
        <div className="p-2 space-y-4 animate-fade-in">
             <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                <h4 className="text-lg font-semibold font-japanese">{data.word}</h4>
                <button onClick={onBack} className="btn-ghost" title="Back to quick info">
                    <i className="bi bi-arrow-left"></i> Back
                </button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <div className="font-semibold text-text-secondary text-sm">Definition</div>
                    <p className="text-text-primary">{data.definition}</p>
                    <p className="text-xs text-text-muted mt-1">{data.part_of_speech}</p>
                </div>
                
                <div>
                    <h5 className="font-semibold text-text-secondary mb-2 text-sm">Example Sentences</h5>
                    <ul className="space-y-4">
                        {data.example_sentences.map((ex: any, i: number) => (
                             <li key={i} className="flex flex-col">
                                <a 
                                    href={`https://jisho.org/search/${encodeURIComponent(ex.japanese)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-base font-jp text-text-primary hover:text-accent transition"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <Furigana base={ex.japanese} reading={ex.reading} />
                                </a>
                                <span className="text-sm text-text-muted">{ex.english}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};