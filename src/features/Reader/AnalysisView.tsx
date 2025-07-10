import React, { useState, useMemo } from 'react';
import { TtsButton } from '../../components/TtsButton.tsx';
import { Segment } from './components/Segment.tsx';
import { GrammarNote } from './components/GrammarNote.tsx';
import { HotkeyLegend } from './components/HotkeyLegend.tsx';
import { useSettings } from '../../contexts/index.ts';
import { getPatternColor } from '../../utils/style-utils.ts';

export function AnalysisView({ analysis, onReanalyze, availableQuizText, onStartQuiz, isQuizLoading }: { analysis: any, onReanalyze: () => void, availableQuizText: string | null, onStartQuiz: () => void, isQuizLoading: boolean }) {
    const [focusedPattern, setFocusedPattern] = useState(null);
    const [showTranslation, setShowTranslation] = useState(false);
    const { state: settingsState } = useSettings();

    const segmentsWithPatterns = useMemo(() => {
        if (!analysis.grammar_patterns) return analysis.analysis.map(seg => ({ ...seg, patterns: [] }));
        
        const segmentPatterns = new Map();
        analysis.grammar_patterns.forEach((pattern: any, i: number) => {
            const color = getPatternColor(i, settingsState.theme);
            const idClass = `pattern-dynamic-${i}`;
            pattern.constituent_indices?.forEach((index: number) => {
                if (!segmentPatterns.has(index)) segmentPatterns.set(index, []);
                segmentPatterns.get(index).push({ ...pattern, idClass, color });
            });
        });
        return analysis.analysis.map((seg: any, i: number) => ({ ...seg, patterns: segmentPatterns.get(i) || [] }));
    }, [analysis, settingsState.theme]);
    
    const handleNoteClick = (pattern: any) => {
        setFocusedPattern((prev: any) => (prev?.idClass === pattern.idClass ? null : pattern));
    };

    return (
        <div className="analysis-view-container animate-fade-in max-w-4xl mx-auto w-full">
            <div id="analysis-header" className="sticky top-0 z-20 bg-surface-soft rounded-lg transition-colors duration-300 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow flex flex-wrap items-start gap-x-1.5 gap-y-1 text-2xl max-h-[50vh] overflow-y-auto no-scrollbar">
                        {segmentsWithPatterns.map((segment: any, index: number) => (
                           <div key={index} className={`transition-opacity duration-300 ${focusedPattern && !segment.patterns.some((p: any) => p.idClass === (focusedPattern as any).idClass) ? 'opacity-30' : 'opacity-100'}`}>
                             <Segment segment={segment} />
                           </div>
                        ))}
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        <TtsButton text={analysis.original_japanese_sentence} title="Read sentence (S)" />
                        <button onClick={onReanalyze} title="Force re-analysis" className="btn-ghost p-1 text-text-muted hover:text-text-primary">
                            <i className="bi bi-arrow-clockwise text-base"></i>
                        </button>
                        <button id="toggle-translation-button" onClick={() => setShowTranslation(prev => !prev)} title="Toggle translation (T)" className="btn-ghost p-1 text-text-muted hover:text-text-primary">
                            <i className="bi bi-translate text-base"></i>
                        </button>
                         {availableQuizText && (
                            <div className="pt-2 mt-2 border-t border-border-subtle w-full flex justify-center">
                                <button 
                                    onClick={onStartQuiz} 
                                    title={isQuizLoading ? "Generating Quiz..." : "Test Comprehension"} 
                                    className="btn-ghost p-1 text-accent hover:text-accent/80 transition-all scale-110 hover:scale-125 disabled:cursor-wait disabled:opacity-70"
                                    disabled={isQuizLoading}
                                >
                                    {isQuizLoading ? (
                                        <i className="bi bi-arrow-repeat text-xl animate-spin"></i>
                                    ) : (
                                        <i className="bi bi-mortarboard-fill text-xl"></i>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {showTranslation && (
                    <div className="translation-text-container mt-4 pt-4 border-t border-dashed border-border-subtle">
                        <p className="text-text-primary text-base">{analysis.english_translation}</p>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-4">
                {analysis.grammar_patterns && analysis.grammar_patterns.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold uppercase text-text-muted mb-3 tracking-wider">Grammar & Phrases</h3>
                        <ul className="space-y-3">
                            {analysis.grammar_patterns.map((pattern: any, index: number) => {
                                const color = getPatternColor(index, settingsState.theme);
                                const idClass = `pattern-dynamic-${index}`;
                                const enhancedPattern = { ...pattern, idClass, color, fullAnalysis: analysis };
                                return (
                                    <GrammarNote
                                        key={index}
                                        pattern={enhancedPattern}
                                        onNoteClick={handleNoteClick}
                                        isFocused={focusedPattern?.idClass === idClass}
                                    />
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
            <HotkeyLegend />
        </div>
    );
}