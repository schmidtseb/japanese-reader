
import { useState, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { getSystemPrompt, getExampleSentenceSystemPrompt, getArticleExtractionPrompt } from '../utils/prompts.ts';
import { JAPANESE_ANALYSIS_SCHEMA, EXAMPLE_SENTENCES_SCHEMA, ARTICLE_EXTRACTION_SCHEMA } from '../utils/structured-output.ts';
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

export const extractTextFromUrl = async (url: string): Promise<{ title: string; japanese_text: string }> => {
    let htmlContent: string;
    // Using a free, public CORS proxy to bypass browser security restrictions for client-side fetching.
    // This is a workaround to enable the feature without a dedicated backend.
    // This public proxy may be unreliable or have rate limits. A dedicated backend is the robust solution for production.
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch via proxy with status: ${response.status}`);
        }
        htmlContent = await response.text();

        // The proxy might return a 200 OK with an error message in the body if the target site fails
        if (!htmlContent || htmlContent.trim() === '' || (htmlContent.includes('error') && htmlContent.length < 500)) {
            throw new Error('Retrieved empty or invalid content from the URL.');
        }

    } catch (e) {
        console.error("Error fetching URL content via proxy:", e);
        // Consolidate error messages for user-friendliness
        throw new Error("Could not retrieve content from the URL. The website might be down, blocking automated access, or the URL is incorrect.");
    }

    const ai = await getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: htmlContent, // Sending the fetched HTML
        config: {
            systemInstruction: getArticleExtractionPrompt(),
            responseMimeType: 'application/json',
            responseSchema: ARTICLE_EXTRACTION_SCHEMA,
            temperature: 0.0,
            seed: 42,
        },
    });

    const jsonStr = getJsonStringFromResponse(response);
    const parsedData = JSON.parse(jsonStr);

    if (!parsedData.japanese_text || parsedData.japanese_text.trim() === '') {
        throw new Error("No Japanese article content could be found at the provided URL.");
    }

    return parsedData;
};


export const useAnalyzeSentence = () => {
    const apiFn = useCallback(analyzeSentenceApi, []);
    return useApiCall(apiFn);
};

export const useGetExampleSentences = () => {
    const apiFn = useCallback(getExampleSentencesApi, []);
    return useApiCall(apiFn);
};
