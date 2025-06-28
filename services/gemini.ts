
// services/gemini.ts
import { GoogleGenAI } from '@google/genai';
import { getSystemPrompt, getExampleSentenceSystemPrompt } from '../prompt.ts';
import { JAPANESE_ANALYSIS_SCHEMA, EXAMPLE_SENTENCES_SCHEMA } from '../structured_output.ts';
import { AnalysisDepth } from '../state.ts';

/**
 * A utility function to add retry logic with exponential backoff to an API call.
 * This is crucial for handling rate limit errors (429).
 * @param apiCall The async function to call.
 * @param maxRetries Maximum number of retries.
 * @param initialDelay Initial delay in milliseconds.
 * @returns The result of the API call.
 */
async function withRetry<T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let retries = 0;
    let delay = initialDelay;

    while (true) {
        try {
            return await apiCall();
        } catch (error: any) {
            // The Gemini API client error message often contains details.
            // Check for status 429 or RESOURCE_EXHAUSTED which indicates a rate limit error.
            const errorMessage = (error.message || '').toLowerCase();
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted');

            if (isRateLimitError && retries < maxRetries) {
                retries++;
                const jitter = Math.random() * 500; // Add jitter to avoid thundering herd
                console.warn(`Rate limit hit. Retrying in ${Math.round(delay + jitter)}ms... (Attempt ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay + jitter));
                delay *= 2; // Exponential backoff
            } else {
                // For other errors or if max retries are reached, rethrow the error.
                throw error;
            }
        }
    }
}

/** Analyzes a single sentence via the API. */
export async function analyzeSentence(apiKey: string, sentence: string, depth: AnalysisDepth): Promise<any> {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = getSystemPrompt(depth);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: sentence,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: JAPANESE_ANALYSIS_SCHEMA,
                temperature: 0.1,
                seed: 42,
            },
        });

        const aggregatedResponse = response.text;
        const jsonStr = aggregatedResponse.trim().match(/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s)?.[1] || aggregatedResponse.trim();
        const parsedData = JSON.parse(jsonStr);
        return Array.isArray(parsedData) ? parsedData[0] : parsedData;
    };
    
    return withRetry(apiCall);
}


/** Fetches example sentences from the API. */
export async function getExampleSentences(apiKey: string, patternName: string): Promise<any[]> {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = getExampleSentenceSystemPrompt();
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: patternName,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: EXAMPLE_SENTENCES_SCHEMA,
                temperature: 0.01,
                seed: 42,
            },
        });
        let jsonStr = response.text.trim().match(/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s)?.[1] || response.text.trim();
        return JSON.parse(jsonStr);
    };

    try {
        return await withRetry(apiCall);
    } catch (error) {
        console.error(`Failed to get examples for "${patternName}":`, error);
        throw new Error(`Could not generate examples for ${patternName}.`);
    }
}
