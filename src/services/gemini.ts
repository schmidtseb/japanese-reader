import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSystemPrompt, getExampleSentenceSystemPrompt, getArticleExtractionPrompt, getKanjiDetailsPrompt, getWordDetailsPrompt, getComprehensionQuizPrompt } from '../utils/prompts.ts';
import { JAPANESE_ANALYSIS_SCHEMA, EXAMPLE_SENTENCES_SCHEMA, ARTICLE_EXTRACTION_SCHEMA, KANJI_DETAILS_SCHEMA, WORD_DETAILS_SCHEMA, COMPREHENSION_QUIZ_SCHEMA } from '../utils/structured-output.ts';
import { AnalysisDepth, useAuth } from '../contexts/index.ts';
import * as db from './db.ts';

// Module-level map to store in-flight promises for sentence analysis
const inFlightAnalysisPromises = new Map<string, Promise<any>>();

const getGenAI = async (supabase: SupabaseClient | null): Promise<GoogleGenAI> => {
    // Priority 1: Get user-specific key from Supabase if logged in
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            try {
                // This function is expected to return a JSON object like { apiKey: "..." }
                const { data, error } = await supabase.functions.invoke('get-user-api-key');
                if (error) throw error;
                if (data?.apiKey) {
                    return new GoogleGenAI({ apiKey: data.apiKey });
                }
            } catch (e) {
                console.warn("Could not retrieve API key from account. Falling back to local/default keys.", e);
            }
        }
    }

    // Priority 2: Get user-provided key from local browser storage
    const settings = await db.getAllSettings();
    if (settings.userApiKey) {
        return new GoogleGenAI({ apiKey: settings.userApiKey });
    }

    // Priority 3: Get app-default key from environment variables
    if (process.env.API_KEY) {
        return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    throw new Error("API Key is not configured. Please add your key in the settings menu or ensure the default key is present.");
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
    const requestRef = useRef(false);

    const execute = useCallback(async (...args: P) => {
        requestRef.current = true;
        setIsLoading(true);
        setError(null);
        setData(null);
        try {
            const result = await apiFn(...args);
            if (requestRef.current) {
                setData(result);
            }
            return result;
        } catch (e) {
            if (requestRef.current) {
                setError(e as Error);
            }
            // Don't throw here, let the component decide
        } finally {
            if (requestRef.current) {
                setIsLoading(false);
            }
        }
    }, [apiFn]);

    const reset = useCallback(() => {
        requestRef.current = false;
        setIsLoading(false);
        setError(null);
        setData(null);
    }, []);

    return { isLoading, error, data, execute, reset };
};

const analyzeSentenceApi = (supabase: SupabaseClient | null, sentence: string, depth: AnalysisDepth, force = false) => {
    const requestKey = `${depth}:${sentence}`;

    if (!force && inFlightAnalysisPromises.has(requestKey)) {
        return inFlightAnalysisPromises.get(requestKey)!;
    }

    const promise = (async () => {
        try {
            const ai = await getGenAI(supabase);
            const sanitizedSentence = sentence.trim().replace(/^[「『]/, '').replace(/[」』]$/, '').trim();
            if (!sanitizedSentence) {
                return {
                    original_japanese_sentence: sentence,
                    analysis: [{ japanese_segment: sentence, reading: sentence, category: 'PUNCTUATION', english_equivalent: 'Punctuation/Quotes', pitch_accent: '' }],
                    grammar_patterns: [],
                    english_translation: '(Sentence consists only of punctuation)'
                };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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
            result.original_japanese_sentence = sentence;
            return result;
        } catch (e) {
            inFlightAnalysisPromises.delete(requestKey);
            throw e;
        }
    })();
    
    inFlightAnalysisPromises.set(requestKey, promise);
    
    return promise;
}

const getExampleSentencesApi = async (supabase: SupabaseClient | null, patternName: string) => {
    const ai = await getGenAI(supabase);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

const getKanjiDetailsApi = async (supabase: SupabaseClient | null, kanji: string) => {
    const ai = await getGenAI(supabase);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: kanji,
        config: {
            systemInstruction: getKanjiDetailsPrompt(),
            responseMimeType: 'application/json',
            responseSchema: KANJI_DETAILS_SCHEMA,
            temperature: 0.0,
            seed: 42,
        },
    });
    const jsonStr = getJsonStringFromResponse(response);
    return JSON.parse(jsonStr);
};

const getWordDetailsApi = async (supabase: SupabaseClient | null, word: string, reading: string) => {
    const ai = await getGenAI(supabase);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the word "${word}" with the reading "${reading}".`,
        config: {
            systemInstruction: getWordDetailsPrompt(),
            responseMimeType: 'application/json',
            responseSchema: WORD_DETAILS_SCHEMA,
            temperature: 0.1,
            seed: 42,
        },
    });
    const jsonStr = getJsonStringFromResponse(response);
    return JSON.parse(jsonStr);
};

const generateComprehensionQuizApi = async (supabase: SupabaseClient | null, text: string) => {
    const ai = await getGenAI(supabase);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: text,
        config: {
            systemInstruction: getComprehensionQuizPrompt(),
            responseMimeType: 'application/json',
            responseSchema: COMPREHENSION_QUIZ_SCHEMA,
            temperature: 0.3,
            seed: 42,
        },
    });
    const jsonStr = getJsonStringFromResponse(response);
    return JSON.parse(jsonStr);
};

export const extractTextFromUrlApi = async (supabase: SupabaseClient | null, url: string): Promise<{ title: string; japanese_text: string }> => {
    let htmlContent: string = '';

    const proxies = [
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://corsproxy.io/?${u}`,
    ];
    
    const TIMEOUT_MS = 15000;
    let lastError: Error | null = null;

    for (const proxyFn of proxies) {
        const proxyUrl = proxyFn(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 408 || response.status === 504) throw new Error("Proxy timed out waiting for the target website.");
                if (response.status === 404) throw new Error("The requested URL was not found (404). Please check the URL.");
                if (response.status === 403) throw new Error("Access to this website is forbidden (403). It may be blocking access.");
                if (response.status >= 500) throw new Error("The website's server encountered an error. Please try again later.");
                throw new Error(`Failed to fetch content (status: ${response.status}).`);
            }
            
            const content = await response.text();
            if (!content || content.trim() === '') throw new Error('Retrieved empty content. The page might be protected or require JavaScript.');
            
            htmlContent = content;
            lastError = null;
            break;

        } catch (e) {
            clearTimeout(timeoutId);
            const proxyHost = new URL(proxyUrl).hostname;
            console.warn(`Proxy ${proxyHost} failed. Trying next...`, e);
            lastError = e instanceof Error ? e : new Error('An unknown fetch error occurred');
            if (lastError.name === 'AbortError') lastError = new Error(`The request to ${proxyHost} timed out.`);
        }
    }
    
    if (!htmlContent) throw new Error(`Failed to fetch from all proxies. Last error: ${lastError?.message || 'Unknown issue.'}`);
    
    const ai = await getGenAI(supabase);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: htmlContent,
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

// --- Hooks for components to use ---

export const useAnalyzeSentence = () => {
    const { supabase } = useAuth();
    const apiFn = useCallback((sentence: string, depth: AnalysisDepth, force: boolean = false) => {
        return analyzeSentenceApi(supabase, sentence, depth, force);
    }, [supabase]);
    return useApiCall(apiFn);
};

export const useGetExampleSentences = () => {
    const { supabase } = useAuth();
    const apiFn = useCallback((patternName: string) => {
        return getExampleSentencesApi(supabase, patternName);
    }, [supabase]);
    return useApiCall(apiFn);
};

export const useGetKanjiDetails = () => {
    const { supabase } = useAuth();
    const apiFn = useCallback((kanji: string) => {
        return getKanjiDetailsApi(supabase, kanji);
    }, [supabase]);
    return useApiCall(apiFn);
};

export const useGetWordDetails = () => {
    const { supabase } = useAuth();
    const apiFn = useCallback((word: string, reading: string) => {
        return getWordDetailsApi(supabase, word, reading);
    }, [supabase]);
    return useApiCall(apiFn);
};

export const useGenerateComprehensionQuiz = () => {
    const { supabase } = useAuth();
    const apiFn = useCallback((text: string) => {
        return generateComprehensionQuizApi(supabase, text);
    }, [supabase]);
    return useApiCall(apiFn);
};

export const useExtractTextFromUrl = () => {
    const { supabase } = useAuth();
    const apiFn = useCallback((url: string) => {
        return extractTextFromUrlApi(supabase, url);
    }, [supabase]);
    return useApiCall(apiFn);
};