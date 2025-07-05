import { useState, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { getSystemPrompt, getExampleSentenceSystemPrompt } from '../utils/prompts.ts';
import { JAPANESE_ANALYSIS_SCHEMA, EXAMPLE_SENTENCES_SCHEMA } from '../utils/structured-output.ts';
import { AnalysisDepth, Settings } from '../contexts/index.ts';
import * as db from './db.ts';

const getGenAI = async () => {
    // Priority: 1. User-provided key, 2. Environment variable key
    const settings = await db.getAllSettings();
    const apiKey = settings.userApiKey || process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API Key is not configured. Please set your key in the settings menu or ensure the default key is present.");
    }
    return new GoogleGenAI({ apiKey });
};

const getJsonStringFromResponse = (response: GenerateContentResponse): string => {
    const text = response.text;
    if (typeof text !== 'string' || text.trim() === '') {
        const candidate = response.candidates?.[0];
        if (candidate && candidate.finishReason !== 'STOP') {
            throw new Error(`The AI model's response was incomplete. Reason: ${candidate.finishReason}.`);
        }
        throw new Error("The AI model returned an empty response.");
    }
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = text.trim().match(fenceRegex);
    return match ? match[1].trim() : text.trim();
};

const useApiCall = <T, P extends any[]>(apiFn: (...args: P) => Promise<T>) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const execute = useCallback(async (...args: P) => {
        setIsLoading(true);
        setError(null);
        setData(null);
        try {
            const result = await apiFn(...args);
            setData(result);
            return result;
        } catch (e) {
            setError(e as Error);
            // Don't throw here, let the component decide
        } finally {
            setIsLoading(false);
        }
    }, [apiFn]);

    return { isLoading, error, data, execute };
};

const analyzeSentenceApi = async (sentence: string, depth: AnalysisDepth, force = false) => {
    const ai = await getGenAI();
    const sanitizedSentence = sentence.trim().replace(/^[「『]/, '').replace(/[」』]$/, '').trim();
    if (!sanitizedSentence) {
        // Return mock analysis for empty/punctuation-only sentences
        return {
            original_japanese_sentence: sentence,
            analysis: [{ japanese_segment: sentence, reading: sentence, category: 'PUNCTUATION', english_equivalent: 'Punctuation/Quotes', pitch_accent: '' }],
            grammar_patterns: [],
            english_translation: '(Sentence consists only of punctuation)'
        };
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: sanitizedSentence,
        config: {
            systemInstruction: getSystemPrompt(depth),
            responseMimeType: 'application/json',
            responseSchema: JAPANESE_ANALYSIS_SCHEMA,
            temperature: 0.1,
            seed: 42,
        },
    });

    const jsonStr = getJsonStringFromResponse(response);
    const parsedData = JSON.parse(jsonStr);
    const result = Array.isArray(parsedData) ? parsedData[0] : parsedData;
    result.original_japanese_sentence = sentence; // Restore original sentence
    return result;
}

const getExampleSentencesApi = async (patternName: string) => {
    const ai = await getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: patternName,
        config: {
            systemInstruction: getExampleSentenceSystemPrompt(),
            responseMimeType: 'application/json',
            responseSchema: EXAMPLE_SENTENCES_SCHEMA,
            temperature: 0.01,
            seed: 42,
        },
    });
    const jsonStr = getJsonStringFromResponse(response);
    return JSON.parse(jsonStr);
};

export const useAnalyzeSentence = () => {
    const apiFn = useCallback(analyzeSentenceApi, []);
    return useApiCall(apiFn);
};

export const useGetExampleSentences = () => {
    const apiFn = useCallback(getExampleSentencesApi, []);
    return useApiCall(apiFn);
};
