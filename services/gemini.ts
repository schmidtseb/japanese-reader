
// services/gemini.ts
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { getSystemPrompt, getExampleSentenceSystemPrompt } from '../prompt.ts';
import { JAPANESE_ANALYSIS_SCHEMA, EXAMPLE_SENTENCES_SCHEMA } from '../structured_output.ts';
import { AnalysisDepth } from '../state.ts';

/**
 * Wraps a promise with a timeout.
 * @param promise The promise to wrap.
 * @param ms The timeout in milliseconds.
 * @returns A new promise that will reject if the original promise doesn't resolve/reject within the given time.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms / 1000} seconds`));
    }, ms);

    promise.then(
      (res) => {
        clearTimeout(timeoutId);
        resolve(res);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
}

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

        const modelPromise = ai.models.generateContent({
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

        const response = await withTimeout(modelPromise, 30000); // 30 second timeout

        const aggregatedResponse = response.text;
        if (typeof aggregatedResponse !== 'string' || aggregatedResponse.trim() === '') {
            console.error("Gemini API returned an empty or invalid text response.", response);
            const candidate = response.candidates?.[0];
            if (candidate && candidate.finishReason !== 'STOP') {
                const safetyReason = `The response may have been blocked. Reason: ${candidate.finishReason}.`;
                throw new Error(`The AI model's response was incomplete. ${safetyReason}`);
            }
            throw new Error("The AI model returned an empty response. This might be due to a content filter or an internal issue.");
        }
        
        const jsonStr = aggregatedResponse.trim().match(/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s)?.[1] || aggregatedResponse.trim();
        try {
            const parsedData = JSON.parse(jsonStr);
            return Array.isArray(parsedData) ? parsedData[0] : parsedData;
        } catch (e) {
            console.error("Failed to parse JSON from model response:", jsonStr);
            throw new Error("The AI model returned a response that was not valid JSON.");
        }
    };
    
    return withRetry(apiCall);
}


/** Fetches example sentences from the API. */
export async function getExampleSentences(apiKey: string, patternName: string): Promise<any[]> {
    const apiCall = async () => {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = getExampleSentenceSystemPrompt();
        
        const modelPromise = ai.models.generateContent({
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

        const response = await withTimeout(modelPromise, 20000); // 20s for examples

        const textResponse = response.text;
        if (typeof textResponse !== 'string' || textResponse.trim() === '') {
            console.error(`Gemini API returned an empty or invalid text response for pattern "${patternName}".`, response);
            const candidate = response.candidates?.[0];
            if (candidate && candidate.finishReason !== 'STOP') {
                const safetyReason = `The response may have been blocked. Reason: ${candidate.finishReason}.`;
                throw new Error(`Could not generate examples for ${patternName}. ${safetyReason}`);
            }
            throw new Error(`The AI model returned an empty response for pattern "${patternName}".`);
        }
        
        let jsonStr = textResponse.trim().match(/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s)?.[1] || textResponse.trim();
        try {
            return JSON.parse(jsonStr);
        } catch(e) {
            console.error(`Failed to parse JSON examples for "${patternName}":`, jsonStr);
            throw new Error(`The AI model returned invalid JSON for examples of "${patternName}".`);
        }
    };

    try {
        return await withRetry(apiCall);
    } catch (error) {
        console.error(`Failed to get examples for "${patternName}":`, error);
        if (error instanceof Error && (error.message.includes('JSON') || error.message.includes('timed out'))) {
            throw error;
        }
        throw new Error(`Could not generate examples for ${patternName}.`);
    }
}
