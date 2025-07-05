// hooks/useSentenceAnalysis.ts
import { useEffect, useMemo, useCallback, useState } from 'react';
import { useAppData, useSettings } from '../contexts/index.ts';
import { useAnalyzeSentence } from '../services/gemini.ts';

export const useSentenceAnalysis = (entryId: string | null, sentence: string | null) => {
    const { state: appDataState, dispatch: appDataDispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { execute: analyzeSentence, error: apiError, isLoading: isApiLoading } = useAnalyzeSentence();

    // The state now holds the analysis FOR A SPECIFIC SENTENCE.
    const [analysisData, setAnalysisData] = useState<{ sentence: string; analysis: any } | null>(null);

    const currentEntry = useMemo(() => {
        if (!entryId) return null;
        return appDataState.history.find(e => e.id === entryId);
    }, [entryId, appDataState.history]);

    const analysisDepth = settingsState.analysisDepth;

    // This is the core effect. It's job is to get data and put it in `analysisData`.
    useEffect(() => {
        let isCancelled = false;

        if (!sentence) {
            setAnalysisData(null);
            return;
        }

        // If our state already matches the requested sentence, we're done.
        if (analysisData?.sentence === sentence) {
            return;
        }

        // Check cache for the new sentence.
        const cachedAnalysis = currentEntry?.analyzedSentences[sentence]?.[analysisDepth] || null;

        if (cachedAnalysis) {
            // Found in cache. Update state and exit.
            setAnalysisData({ sentence, analysis: cachedAnalysis });
            return;
        }

        // Not in state, not in cache. Must fetch.
        // Clear previous state immediately to trigger loading UI.
        setAnalysisData(null);

        analyzeSentence(sentence, analysisDepth).then(result => {
            if (!isCancelled && result) {
                // Set the result, but only if we're still supposed to be showing this sentence.
                // This handles race conditions if the user navigates quickly.
                setAnalysisData({ sentence, analysis: result });
            }
        });

        return () => { isCancelled = true; };
    }, [sentence, analysisDepth, currentEntry, analyzeSentence, analysisData?.sentence]);
    
    // Effect to write to cache after a successful fetch.
    useEffect(() => {
        if (analysisData && entryId) {
            const isCached = !!currentEntry?.analyzedSentences[analysisData.sentence]?.[analysisDepth];
            if (!isCached) {
                appDataDispatch({
                    type: 'CACHE_ANALYSIS',
                    payload: {
                        entryId,
                        sentence: analysisData.sentence,
                        depth: analysisDepth,
                        analysis: analysisData.analysis,
                    },
                });
            }
        }
    }, [analysisData, entryId, analysisDepth, currentEntry, appDataDispatch]);
    
    const reanalyze = useCallback(() => {
        if (!sentence) return;
        setAnalysisData(null); // Clear old data to force loading state
        analyzeSentence(sentence, analysisDepth, true).then(result => {
            if (result) {
                setAnalysisData({ sentence, analysis: result });
            }
        });
    }, [sentence, analysisDepth, analyzeSentence]);

    // DERIVE a consistent return value for the current render cycle.
    // This is the FIX. We don't return the state directly.
    // We check if the state we have matches the sentence prop we received.
    const analysisForCurrentProp = analysisData?.sentence === sentence ? analysisData.analysis : null;

    return {
        analysis: analysisForCurrentProp,
        isLoading: isApiLoading || (!!sentence && !analysisForCurrentProp && !apiError),
        error: apiError,
        reanalyze,
    };
};
