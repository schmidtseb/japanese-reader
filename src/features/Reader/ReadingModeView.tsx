import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useAppData, useUI, useSettings, View } from '../../contexts/index.ts';
import { useSentenceAnalysis } from '../../hooks/useSentenceAnalysis.ts';
import { useAnalyzeSentence, useGenerateComprehensionQuiz } from '../../services/gemini.ts';
import { AnalysisView } from './AnalysisView.tsx';
import { ErrorComponent } from '../../components/ErrorComponent.tsx';
import { AnalysisPlaceholder } from './components/AnalysisPlaceholder.tsx';
import { ReadingModeHeader } from './components/ReadingModeHeader.tsx';
import { FloatingNavButtons } from './components/FloatingNavButtons.tsx';
import { ComprehensionQuiz } from './components/ComprehensionQuiz.tsx';


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
    
    const [availableQuizText, setAvailableQuizText] = useState<string | null>(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const { isLoading: isQuizLoading, error: quizError, data: quizData, execute: generateQuiz, reset: resetQuiz } = useGenerateComprehensionQuiz();
    
    const currentEntry = appDataState.history.find(e => e.id === appDataState.currentTextEntryId);
    
    // --- Sentence & Paragraph Logic ---
    const paragraphs = useMemo(() => currentEntry?.text.split('\n').filter(p => p.trim()) || [], [currentEntry?.text]);
    const sentencesByParagraph = useMemo(() => paragraphs.map(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []), [paragraphs]);
    const sentences = useMemo(() => sentencesByParagraph.flat(), [sentencesByParagraph]);

    const sentenceIndex = currentEntry?.readingProgress ?? 0;
    const sentence = sentences[sentenceIndex];
    const nextSentence = sentences[sentenceIndex + 1];

    const { analysis, isLoading: isAnalysisLoading, error: analysisError, reanalyze } = useSentenceAnalysis(currentEntry?.id, sentence);
    const { execute: prefetchSentence } = useAnalyzeSentence();

    const handleStartQuiz = () => {
        if (availableQuizText) {
            generateQuiz(availableQuizText);
        }
    };
    
    useEffect(() => {
        if (quizData) {
            setShowQuiz(true);
            setAvailableQuizText(null); // Hide indicator once quiz is shown
        }
    }, [quizData]);

    const handleCloseQuiz = () => {
        setShowQuiz(false);
        resetQuiz();
    };

    // --- UI Visibility & Navigation Logic ---
    const showHeader = useCallback(() => {
        setIsHeaderVisible(true);
        if (headerTimerRef.current) window.clearTimeout(headerTimerRef.current);
        headerTimerRef.current = window.setTimeout(() => {
            setIsHeaderVisible(false);
        }, 4000);
    }, []);

    const keepHeaderVisible = useCallback((keepVisible: boolean) => {
        if (headerTimerRef.current) {
            window.clearTimeout(headerTimerRef.current);
            headerTimerRef.current = null;
        }
        if (!keepVisible) {
            headerTimerRef.current = window.setTimeout(() => {
                setIsHeaderVisible(false);
            }, 2500);
        }
    }, []);

    const handleActivity = useCallback(() => {
        setIsFloatingNavVisible(true);
        if (floatingNavInactivityTimerRef.current) window.clearTimeout(floatingNavInactivityTimerRef.current);
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

    // --- Effect Hooks ---
    
    // Quiz availability logic
    useEffect(() => {
        if (!currentEntry || sentences.length === 0) return;
        
        // Reset quiz availability by default on navigation
        setAvailableQuizText(null); 

        let currentParaIndex = -1;
        let sentencesCumulative = 0;
        for (let i = 0; i < sentencesByParagraph.length; i++) {
            sentencesCumulative += sentencesByParagraph[i].length;
            if (sentenceIndex < sentencesCumulative) {
                currentParaIndex = i;
                break;
            }
        }
        
        if (currentParaIndex === -1 && sentences.length > 0) {
            // This can happen if readingProgress is out of sync, handle gracefully
            currentParaIndex = sentencesByParagraph.length - 1;
        } else if (currentParaIndex === -1) {
            return;
        }

        const sentencesInCurrentPara = sentencesByParagraph[currentParaIndex];
        const firstSentenceIndexOfCurrentPara = sentencesCumulative - sentencesInCurrentPara.length;
        const indexWithinPara = sentenceIndex - firstSentenceIndexOfCurrentPara;

        const isLastSentenceOfPara = indexWithinPara === sentencesInCurrentPara.length - 1;
        const isLastSentenceOfText = sentenceIndex === sentences.length - 1;
        
        if (isLastSentenceOfText) {
            setAvailableQuizText(currentEntry.text);
        } else if (isLastSentenceOfPara) {
            setAvailableQuizText(paragraphs[currentParaIndex]);
        }

    }, [sentenceIndex, sentences, paragraphs, sentencesByParagraph, currentEntry]);


    // Cleanup UI state and cancel quiz generation when sentence changes
    useEffect(() => {
        uiDispatch({ type: 'HIDE_BOTTOM_SHEET' });
        uiDispatch({ type: 'HIDE_TOOLTIP' });
        handleActivity();
        
        // When the sentence changes, cancel any ongoing quiz generation and hide the quiz.
        resetQuiz();
        setShowQuiz(false);

    }, [sentence, uiDispatch, handleActivity, resetQuiz]);
    
    // Activity listeners setup
    useEffect(() => {
        handleActivity();
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleActivity, { passive: true });
        }
        return () => {
            if (headerTimerRef.current) window.clearTimeout(headerTimerRef.current);
            if (floatingNavInactivityTimerRef.current) window.clearTimeout(floatingNavInactivityTimerRef.current);
            if (scrollContainer) scrollContainer.removeEventListener('scroll', handleActivity);
        };
    }, [handleActivity]);

    // Touch navigation
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
            showHeader(); return;
        }
        if (duration < 500 && Math.abs(diffX) > 50 && Math.abs(diffY) < 50) {
            handleNav(diffX > 0 ? 'prev' : 'next'); return;
        }
        if (duration < 250 && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
            handleActivity(); return;
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
             <div className="fixed top-0 left-0 right-0 h-5 z-40" onClick={showHeader} />
             <ReadingModeHeader
                entry={currentEntry}
                onExit={() => appDataDispatch({type: 'SET_VIEW', payload: View.Reader})}
                onSentenceChange={handleSentenceChange}
                totalSentences={sentences.length}
                isVisible={isHeaderVisible}
                onKeepVisible={keepHeaderVisible}
            />
            <FloatingNavButtons
                isVisible={isFloatingNavVisible}
                onNav={handleNav}
                sentenceIndex={sentenceIndex}
                totalSentences={sentences.length}
            />
            <main className="flex-1 flex flex-col min-h-0">
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
                    {(() => {
                        if (!sentence) {
                            // This state is hit when readingProgress >= sentences.length
                            return (
                                <div className="text-center p-8 text-text-muted flex flex-col items-center justify-center h-full">
                                    <h2 className="text-2xl font-bold text-text-primary mb-4">End of Text</h2>
                                    <p className="mb-6">You've finished reading. Ready to test your knowledge?</p>
                                     <button onClick={handleStartQuiz} className="btn-primary" disabled={isQuizLoading || !availableQuizText}>
                                        {isQuizLoading ? (
                                            <><i className="bi bi-arrow-repeat animate-spin mr-2"></i> Generating Quiz...</>
                                        ) : ("Test My Comprehension")}
                                    </button>
                                    {quizError && <ErrorComponent error={quizError} onRetry={handleStartQuiz} />}
                                </div>
                            );
                        }
                        if (analysisError) {
                            return <ErrorComponent error={analysisError} onRetry={reanalyze} />;
                        }
                        if (analysis) {
                            return <AnalysisView analysis={analysis} onReanalyze={reanalyze} availableQuizText={availableQuizText} onStartQuiz={handleStartQuiz} isQuizLoading={isQuizLoading} />;
                        }
                        return <AnalysisPlaceholder sentence={sentence} isLoading={isAnalysisLoading} />;
                    })()}
                </div>
            </main>
            {showQuiz && quizData && <ComprehensionQuiz quizData={quizData} onClose={handleCloseQuiz} />}
        </div>
    );
};