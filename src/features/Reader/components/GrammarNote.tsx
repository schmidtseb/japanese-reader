// src/features/Reader/components/GrammarNote.tsx
import React, { useState } from 'react';
import { AddToDeckButton } from './AddToDeckButton.tsx';
import { Furigana } from '../../../components/Furigana.tsx';
import { useGetExampleSentences } from '../../../services/gemini.ts';

interface GrammarNoteProps {
    pattern: any;
    onNoteClick: (pattern: any) => void;
    isFocused: boolean;
}

export const GrammarNote: React.FC<GrammarNoteProps> = ({ pattern, onNoteClick, isFocused }) => {
    const { isLoading, error, data, execute: getExampleSentences } = useGetExampleSentences();
    const [showExamples, setShowExamples] = useState(false);

    const handleExampleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data) {
            setShowExamples(!showExamples);
        } else {
            getExampleSentences(pattern.pattern_name);
            setShowExamples(true);
        }
    };

    const itemId = `grammar-${pattern.pattern_name}`;
    const constituentText = (pattern.constituent_indices || [])
        .map((index: number) => {
            // Defensive check: Ensure the segment exists before accessing its properties.
            const segment = pattern.fullAnalysis.analysis[index];
            return segment ? segment.japanese_segment : null;
        })
        .filter(Boolean) // Remove any nulls from invalid indices
        .join('');

    const patternContent = {
        pattern_name: pattern.pattern_name,
        explanation: pattern.explanation,
        original_sentence: pattern.fullAnalysis.original_japanese_sentence,
        constituent_text: constituentText
    };

    return (
        <li
            className={`flex gap-4 p-4 rounded-lg bg-surface-subtle cursor-pointer transition-all duration-200 ${isFocused ? 'is-focused ring-2 ring-focus-ring bg-surface-soft' : ''}`}
            data-pattern-id={pattern.idClass}
            onClick={() => onNoteClick(pattern)}
        >
            <span
              className="flex-shrink-0 w-1.5 rounded-full"
              style={{ backgroundColor: pattern.color }}
            ></span>
            <div className="flex-grow">
                <strong className="font-semibold text-accent">{pattern.pattern_name}</strong>
                <p className="text-sm text-text-muted mt-1">{pattern.explanation}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <button
                        className="show-examples-button text-xs font-semibold px-2 py-1 rounded-md border border-accent text-accent hover:bg-accent hover:text-primary-text transition inline-flex items-center gap-2 disabled:opacity-50"
                        onClick={handleExampleClick}
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="bi bi-arrow-repeat text-base animate-spin"></i> : <i className="bi bi-card-list text-base"></i>}
                        <span className="button-text">{showExamples && data ? 'Hide' : 'Examples'}</span>
                    </button>
                    <AddToDeckButton itemId={itemId} itemType="grammar" itemContent={patternContent} />
                </div>
                {showExamples && (
                    <div className="examples-container mt-4 pt-4 border-t border-dashed border-border-subtle">
                        {error && <p className="text-xs text-destructive-subtle-text">{error.message}</p>}
                        {data && (
                            <dl className="flex flex-col gap-4">
                                {data.map((ex: any, i: number) => (
                                    <React.Fragment key={i}>
                                        <dt><span className="text-lg font-jp"><Furigana base={ex.japanese} reading={ex.reading} /></span></dt>
                                        <dd className="text-sm text-text-muted -mt-1">{ex.english}</dd>
                                    </React.Fragment>
                                ))}
                            </dl>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
};