import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useAppData, useUI, useSettings, View } from '../../contexts/index.ts';
import { useSentenceAnalysis } from '../../hooks/useSentenceAnalysis.ts';
import { useAnalyzeSentence } from '../../services/gemini.ts';
import { AnalysisView } from './AnalysisView.tsx';
import { ErrorComponent } from '../../components/ErrorComponent.tsx';
import { AnalysisPlaceholder } from '../../components/AnalysisPlaceholder.tsx';
import { ReadingModeHeader } from '../../components/ReadingModeHeader.tsx';
import { FloatingNavButtons } from './components/FloatingNavButtons.tsx';


export const ReadingModeView = () => {
    const { state: appDataState, dispatch: appDataDispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { dispatch: uiDispatch } = useUI();
    const [isHeaderVisible, setIsHeaderVisible] = useState(false);
    const [isFloatingNavVisible, setIsFloatingNavVisible] = useState(true);

    const headerTimerRef = useRef<number | null>(null);
    const floatingNavInactivityTimerRef = useRef<number | null>(null);
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const currentEntry = appDataState.history.find(e => e.id === appDataState.currentTextEntryId);
    
    const sentences = useMemo(() => currentEntry?.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []) || [], [currentEntry?.text]);
    const sentenceIndex = currentEntry?.readingProgress ?? 0;
    const sentence = sentences[sentenceIndex];
    const nextSentence = sentences[sentenceIndex + 1];

    const { analysis, isLoading, error, reanalyze } = useSentenceAnalysis(currentEntry?.id, sentence);
    const { execute: prefetchSentence } = useAnalyzeSentence();

    const showHeader = useCallback(() => {
        setIsHeaderVisible(true);
        if (headerTimerRef.current) window.clearTimeout(headerTimerRef.current);
        headerTimerRef.current = window.setTimeout(() => {
            setIsHeaderVisible(false);
        }, 4000);
    }, []);

    const handleActivity = useCallback(() => {
        setIsFloatingNavVisible(true);
        if (floatingNavInactivityTimerRef.current) {
            window.clearTimeout(floatingNavInactivityTimerRef.current);
        }
        floatingNavInactivityTimerRef.current = window.setTimeout(() => {
            setIsFloatingNavVisible(false);
        }, 1500);
    }, []);

    const handleNav = useCallback((dir: 'next' | 'prev') => {
        const canNavPrev = dir === 'prev' && sentenceIndex > 0;
        const canNavNext = dir === 'next' && sentenceIndex < sentences.length - 1;

        if (canNavPrev || canNavNext) {
            appDataDispatch({ type: 'NAVIGATE_SENTENCE', payload: { direction: dir }});
            if (navigator.vibrate) navigator.vibrate(10);
            handleActivity();
        }
    }, [appDataDispatch, sentenceIndex, sentences.length, handleActivity]);

    const handleSentenceChange = useCallback((index: number) => {
        appDataDispatch({ type: 'JUMP_TO_SENTENCE', payload: { index }});
    }, [appDataDispatch]);

    // When sentence changes, close any open tooltips or bottom sheets and register activity.
    useEffect(() => {
        uiDispatch({ type: 'HIDE_BOTTOM_SHEET' });
        uiDispatch({ type: 'HIDE_TOOLTIP' });
        handleActivity();
    }, [sentence, uiDispatch, handleActivity]);
    
    // Set up activity listeners on mount.
    useEffect(() => {
        handleActivity();
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleActivity, { passive: true });
        }
        return () => {
            if (headerTimerRef.current) window.clearTimeout(headerTimerRef.current);
            if (floatingNavInactivityTimerRef.current) window.clearTimeout(floatingNavInactivityTimerRef.current);
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleActivity);
            }
        };
    }, [handleActivity]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        handleActivity();
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.changedTouches[0];
        const { x: startX, y: startY, time: startTime } = touchStartRef.current;
        const { clientX: endX, clientY: endY } = touch;
        
        const duration = Date.now() - startTime;
        const diffX = endX - startX;
        const diffY = endY - startY;

        if (startY < 50 && diffY > 30 && Math.abs(diffX) < 30) {
            showHeader();
            return;
        }

        if (duration < 500 && Math.abs(diffX) > 50 && Math.abs(diffY) < 50) {
            handleNav(diffX > 0 ? 'prev' : 'next');
            return;
        }

        if (duration < 250 && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
            const tapPosition = endX / window.innerWidth;
            if (tapPosition < 0.25) {
                handleNav('prev');
            } else if (tapPosition > 0.75) {
                handleNav('next');
            } else {
                handleActivity(); // Tap in middle zone is activity.
            }
            return;
        }
    };


    // Prefetch next sentence analysis
    useEffect(() => {
        if (currentEntry && nextSentence) {
            const isNextCached = !!currentEntry.analyzedSentences[nextSentence]?.[settingsState.analysisDepth];
            if (!isNextCached) {
                prefetchSentence(nextSentence, settingsState.analysisDepth).then(prefetchedAnalysis => {
                    if (prefetchedAnalysis && currentEntry) {
                         appDataDispatch({
                            type: 'CACHE_ANALYSIS',
                            payload: { entryId: currentEntry.id, sentence: nextSentence, depth: settingsState.analysisDepth, analysis: prefetchedAnalysis }
                        });
                    }
                });
            }
        }
    }, [nextSentence, currentEntry, settingsState.analysisDepth, prefetchSentence, appDataDispatch]);

    if (!currentEntry) return <div>Error: No text selected.</div>;
    
    return (
        <div
            className="reading-mode-view h-screen flex flex-col bg-surface"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleActivity}
        >
             <div
                className="fixed top-0 left-0 right-0 h-5 z-40"
                onClick={showHeader}
            />
             <ReadingModeHeader
                entry={currentEntry}
                onExit={() => appDataDispatch({type: 'SET_VIEW', payload: View.Reader})}
                onSentenceChange={handleSentenceChange}
                totalSentences={sentences.length}
                isVisible={isHeaderVisible}
            />
            <FloatingNavButtons
                isVisible={isFloatingNavVisible}
                onNav={handleNav}
                sentenceIndex={sentenceIndex}
                totalSentences={sentences.length}
            />
            {/* The main content area with flex layout */}
            <main className="flex-1 flex flex-col min-h-0">
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
                    {(() => {
                        if (!sentence) {
                            return <div className="text-center p-8 text-text-muted">End of text.</div>;
                        }
                        if (error) {
                            return <ErrorComponent message={error.message} onRetry={reanalyze} />;
                        }
                        if (analysis) {
                            return (
                                <AnalysisView 
                                    analysis={analysis} 
                                    onReanalyze={reanalyze}
                                />
                            );
                        }
                        return <AnalysisPlaceholder sentence={sentence} isLoading={isLoading} />;
                    })()}
                </div>
            </main>
        </div>
    );
};