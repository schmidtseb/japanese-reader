// hooks/useSentenceAnalysis.ts
import { useEffect, useMemo, useCallback } from 'react';
import { useAppData, useSettings } from '../contexts/index.ts';
import { useAnalyzeSentence } from '../services/gemini.ts';

export const useSentenceAnalysis = (entryId: string | null, sentence: string | null) => {
    const { state: appDataState, dispatch: appDataDispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { isLoading, error, data: fetchedAnalysis, execute: analyzeSentence } = useAnalyzeSentence();

    const currentEntry = useMemo(() => {
        if (!entryId) return null;
        return appDataState.history.find(e => e.id === entryId);
    }, [entryId, appDataState.history]);

    const analysisDepth = settingsState.analysisDepth;

    const cachedAnalysis = useMemo(() => {
        if (!currentEntry || !sentence) return null;
        return currentEntry.analyzedSentences[sentence]?.[analysisDepth] || null;
    }, [currentEntry, sentence, analysisDepth]);

    const reanalyze = useCallback(() => {
        if (!sentence) return;
        analyzeSentence(sentence, analysisDepth, true);
    }, [sentence, analysisDepth, analyzeSentence]);

    // Effect to fetch analysis if not cached
    useEffect(() => {
        if (sentence && !cachedAnalysis && !isLoading && !fetchedAnalysis && !error) {
             analyzeSentence(sentence, analysisDepth);
        }
    }, [sentence, cachedAnalysis, isLoading, fetchedAnalysis, analyzeSentence, analysisDepth, error]);
    
    // Effect to cache analysis when it's fetched
    useEffect(() => {
        if (fetchedAnalysis && sentence && entryId && !cachedAnalysis) {
            appDataDispatch({
                type: 'CACHE_ANALYSIS',
                payload: {
                    entryId,
                    sentence,
                    depth: analysisDepth,
                    analysis: fetchedAnalysis,
                }
            });
        }
    }, [fetchedAnalysis, sentence, entryId, cachedAnalysis, appDataDispatch, analysisDepth]);

    return {
        analysis: cachedAnalysis || fetchedAnalysis,
        isLoading: isLoading || (!!sentence && !cachedAnalysis && !error),
        error,
        reanalyze,
    };
};
