
// services/gemini.ts
import { GoogleGenAI } from '@google/genai';
import { getSystemPrompt, createExampleSentencePrompt } from '../prompt.ts';
import { JAPANESE_ANALYSIS_SCHEMA, EXAMPLE_SENTENCES_SCHEMA } from '../structured_output.ts';
import { AnalysisDepth } from '../state.ts';

/** Analyzes a single sentence via the API. */
export async function analyzeSentence(apiKey: string, sentence: string, depth: AnalysisDepth): Promise<any> {
    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = getSystemPrompt(depth);
    const prompt = `Analyze the following Japanese sentence: "${sentence}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: systemPrompt + prompt,
        config: {
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
}


/** Fetches example sentences from the API. */
export async function getExampleSentences(apiKey: string, patternName: string): Promise<any[]> {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = createExampleSentencePrompt(patternName);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: EXAMPLE_SENTENCES_SCHEMA,
                temperature: 0.01,
                seed: 42,
            },
        });
        let jsonStr = response.text.trim().match(/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s)?.[1] || response.text.trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error(`Failed to get examples for "${patternName}":`, error);
        throw new Error(`Could not generate examples for ${patternName}.`);
    }
}
