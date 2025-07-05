


import React, { useEffect, useMemo, useCallback } from 'react';
import { useAppData, View } from '../../contexts/index.ts';
import { useSentenceAnalysis } from '../../hooks/useSentenceAnalysis.ts';
import { AnalysisView } from './AnalysisView.tsx';
import { ErrorComponent } from '../../components/ErrorComponent.tsx';
import { AnalysisPlaceholder } from '../../components/AnalysisPlaceholder.tsx';

export const ReaderView = () => {
    const { state, dispatch } = useAppData();
    const currentEntry = state.history.find(e => e.id === state.currentTextEntryId);
    const { analysis, isLoading, error, reanalyze } = useSentenceAnalysis(currentEntry?.id, state.selectedSentence);
    
    const handleSentenceClick = useCallback((sentence: string) => {
        dispatch({ type: 'SET_SELECTED_SENTENCE', payload: sentence });
    }, [dispatch]);
    
    if (!currentEntry) {
        useEffect(() => { dispatch({type: 'RESET_VIEW'}) }, [dispatch]);
        return null;
    }

    const handleEdit = () => {
        if (currentEntry) {
            dispatch({ type: 'START_EDITING', payload: currentEntry.id });
        }
    };
    
    const handleStartReading = () => {
        if (!currentEntry) return;

        const sentences = currentEntry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
        const selectedIndex = state.selectedSentence ? sentences.indexOf(state.selectedSentence) : -1;
        
        // Start at selected sentence, or current progress, or 0
        const newProgress = selectedIndex !== -1 ? selectedIndex : (currentEntry.readingProgress || 0);

        // Dispatch update first, then change view
        dispatch({
            type: 'ADD_OR_UPDATE_TEXT_ENTRY',
            payload: { ...currentEntry, readingProgress: newProgress }
        });
        dispatch({ type: 'SET_VIEW', payload: View.ReadingMode });
    };

    const paragraphs = currentEntry.text.split('\n').map(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
    
    return (
        <div className="flex-grow min-h-0 overflow-y-auto md:grid md:grid-cols-2 md:overflow-hidden">
            {/* Left Pane: Text Content. Uses Grid on desktop for robust scrolling. */}
            <div className="p-6 flex flex-col md:h-full md:grid md:grid-rows-[auto_1fr] md:gap-y-4">
                <div className="flex justify-between items-center mb-4 md:mb-0">
                    <h2 className="text-xl font-bold text-text-primary truncate" title={currentEntry.title}>{currentEntry.title}</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={handleEdit} title="Edit Text" className="btn-ghost">
                            <i className="bi bi-pencil-square text-xl"></i>
                        </button>
                        <button id="start-reading-button" onClick={handleStartReading} title="Start Reading Mode" className="inline-flex items-center justify-center p-2.5 rounded-full text-primary-text bg-accent hover:bg-accent/90 focus-ring shadow-sm">
                            <i className="bi bi-book text-2xl"></i>
                        </button>
                    </div>
                </div>
                <div id="reader-view-text-container" className="reader-view-text bg-surface-soft border border-border rounded-lg p-4 sm:p-6 overflow-y-auto no-scrollbar min-h-0 max-h-[40vh]">
                    {paragraphs.map((sentences, pIndex) => (
                        <p key={pIndex} className="text-lg sm:text-xl leading-relaxed mb-4 last:mb-0">
                            {sentences.length > 0 ? sentences.map((sentence, sIndex) => {
                                const isSelected = state.selectedSentence === sentence;
                                const hasAnalysis = !!currentEntry?.analyzedSentences[sentence];
                                const sentenceClasses = [
                                    'clickable-sentence', 'cursor-pointer', 'rounded', 'p-1', '-m-1',
                                    'transition-colors', 'duration-200', 'hover:bg-accent-selected-bg/50'
                                ];
                                if (isSelected) {
                                    sentenceClasses.push('selected', 'bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30', 'font-semibold');
                                } else if (hasAnalysis) {
                                    sentenceClasses.push('has-analysis');
                                }
                                
                                return (
                                    <React.Fragment key={sIndex}>
                                        <span
                                            className={sentenceClasses.join(' ')}
                                            onClick={() => handleSentenceClick(sentence)}
                                        >
                                            {sentence}
                                        </span>
                                        {' '}
                                    </React.Fragment>
                                );
                            }) : <>&nbsp;</>}
                        </p>
                    ))}
                </div>
            </div>
             {/* Right Pane: Analysis. This entire pane will scroll on desktop. */}
            <div className="md:h-full md:overflow-y-auto no-scrollbar md:border-l border-border">
                <div className="p-6 md:h-full">
                    <div id="analysis-view" className="md:h-full">
                        {(() => {
                            if (!state.selectedSentence) {
                                return <div className="text-center p-8 text-text-muted md:h-full flex items-center justify-center">Select a sentence to begin.</div>;
                            }
                            if (error) {
                                return <ErrorComponent message={error.message} onRetry={reanalyze} />;
                            }
                            if (analysis) {
                                return <AnalysisView analysis={analysis} onReanalyze={reanalyze} />;
                            }
                            return <AnalysisPlaceholder sentence={state.selectedSentence} isLoading={isLoading} />;
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};