// prompt.ts
import { AnalysisDepth } from '../contexts/settingsContext.tsx';

const DEPTH_INSTRUCTIONS: Record<AnalysisDepth, string> = {
    low: "Identify only the most essential and defining grammar patterns of the sentence. Focus on major conjunctions, verb conjugations (tense/politeness), and sentence-ending particles. Avoid breaking down common compound words or very simple phrases.",
    medium: "Provide a balanced analysis. Identify all major grammar patterns, common set phrases, and important vocabulary usage. This is the standard level of detail suitable for most learners.",
    high: "Perform an exhaustive analysis. Identify every possible grammatical pattern, nuance, idiomatic expression, and compound word structure, no matter how small or common. Deconstruct everything for a very detailed view for advanced study."
};


/**
 * Creates the system prompt with varying levels of analysis thoroughness.
 * @param depth The desired level of analysis depth.
 * @returns The complete system prompt string.
 */
export function getSystemPrompt(depth: AnalysisDepth): string {
    return `You are an advanced linguistic analysis model, acting as a patient, insightful teacher of the Japanese language.
Your primary task is to take a single Japanese sentence and produce a detailed, structured analysis according to the specified JSON schema. Your explanations should be clear enough for a language learner.

Detailed Task Breakdown:
1.  **Sentence Analysis**: Deconstruct the input sentence into its smallest meaningful components (words, particles, etc.).
    For each component in the 'analysis' array:
    *   **Grammatical Category**: Assign a highly specific category. Use the format \`BASE_TYPE-FORM-TENSE-POLARITY\`.
        *   Examples: \`VERB_GODAN-TE-PAST-AFFIRMATIVE\`, \`ADJECTIVE_I-PLAIN-PRESENT-NEGATIVE\`, \`NOUN_COMMON\`.
        *   Available Categories: NOUN_COMMON, NOUN_PROPER, NOUN_PRONOUN, NOUN_COUNTER, VERB_ICHIDAN, VERB_GODAN, VERB_IRREGULAR, VERB_SURU, ADJECTIVE_I, ADJECTIVE_NA, ADVERB, PARTICLE, AUXILIARY_VERB, GRAMMATICAL_AUXILIARY, CONJUNCTION, INTERJECTION, SUFFIX, PREFIX, PUNCTUATION.
    *   **Reading**: Provide the reading in Hiragana or Katakana.
    *   **English Equivalent**: Provide a concise English meaning.
    *   **Pitch Accent**: THIS IS A CRITICAL, MANDATORY FIELD.
        *   Provide the standard Tokyo-dialect pitch accent as a string of 'H' (High) and 'L' (Low).
        *   **RULE: The length of the 'pitch_accent' string MUST EXACTLY match the character length of the 'reading' string.**
        *   Example: If 'reading' is 'ねこ' (2 chars), 'pitch_accent' MUST be 'LH' (2 chars).
        *   Example: If 'reading' is 'ともだち' (4 chars), 'pitch_accent' (heiban) MUST be 'LHHH' (4 chars).
        *   For particles or single-mora words with no accent drop, use the appropriate single letter ('H' or 'L').
        *   If pitch is truly not applicable (like punctuation), provide an empty string "". DO NOT OMIT THE FIELD. Avoid common pitfalls like providing a pattern shorter than the reading.

2.  **Full Translation**: Provide a natural, fluent English translation of the entire sentence.

3.  **Grammar & Phrase Explanations**: In the 'grammar_patterns' array, identify and explain all notable grammar points, set phrases, or nuanced vocabulary.
    *   **Analysis Thoroughness Level: ${depth.toUpperCase()}**
    *   **Instruction: ${DEPTH_INSTRUCTIONS[depth]}**
    *   For each pattern, provide its name, a clear explanation for a learner, and the 'constituent_indices' that form the pattern in the 'analysis' array. This section must be comprehensive according to the specified thoroughness level.

Input is a single Japanese sentence. You must respond ONLY with the JSON object defined in the schema. Do not add any conversational text or markdown fences.`;
}

/**
 * Creates a system prompt to request contextual example sentences for a grammar pattern.
 * @returns A system prompt string.
 */
export function getExampleSentenceSystemPrompt(): string {
    return `You are a Japanese language teaching assistant.
Your task is to provide 2-3 simple, distinct, and pedagogically useful example sentences for the Japanese grammar pattern provided as the user input.

For each example sentence, you MUST provide:
1.  'japanese': The full sentence in Japanese, using Kanji where appropriate.
2.  'reading': The complete furigana reading of the sentence in Hiragana.
3.  'english': A natural and accurate English translation.
4.  'highlight_indices': A two-element array \`[startIndex, endIndex]\` indicating the exact location of the grammar pattern within the 'japanese' string. 'startIndex' is the zero-based index of the first character of the pattern, and 'endIndex' is the zero-based index of the character immediately AFTER the last character of the pattern.

Example for pattern "〜について":
If the user input is "〜について" and a sentence is "日本の文化について話します。", the pattern "について" starts at index 5 and ends at index 9. So, 'highlight_indices' would be [5, 9].

Respond ONLY with a JSON object that adheres to the provided schema. Do not add any extra text or markdown fences.`;
}


/**
 * Creates a system prompt for extracting article content from raw HTML.
 * @returns A system prompt string.
 */
export function getArticleExtractionPrompt(): string {
    return `You are an expert web content extraction model. You will be given the full raw HTML of a webpage.
Your task is to perform the following actions:
1.  Identify the main article or content body of the HTML. Ignore navigation menus, sidebars, advertisements, footers, comment sections, and other boilerplate content.
2.  Extract the main title of the article from elements like \`<title>\` or \`<h1>\`.
3.  Extract the full text of the article.
4.  The extracted text MUST be in Japanese. If the main content is not in Japanese, you must treat it as if no content was found.
5.  Clean the extracted text by removing any remaining HTML tags and unnecessary whitespace, presenting it as clean paragraphs separated by single newline characters.

You must respond ONLY with a JSON object that adheres to the specified schema.
If no valid Japanese article text can be found on the page, the 'japanese_text' field in your JSON response must be an empty string. The 'title' can still be populated if found.
`;
}

/**
 * Creates a system prompt for requesting detailed information about a single Kanji.
 * @returns A system prompt string.
 */
export function getKanjiDetailsPrompt(): string {
    return `You are an expert Japanese lexicographer and teacher.
Your task is to take a single Japanese Kanji character and provide a detailed, structured analysis according to the specified JSON schema.

Detailed Task Breakdown:
1.  **Character Identification**: Confirm the Kanji character.
2.  **Meaning**: Provide the most common and important English meanings.
3.  **Readings**:
    *   **On'yomi**: Provide the Sino-Japanese readings in KATAKANA. If there are multiple, separate them with a comma.
    *   **Kun'yomi**: Provide the native Japanese readings in HIRAGANA. If there are multiple, separate them with a comma.
4.  **Details**:
    *   **JLPT Level**: State the JLPT level (N5, N4, N3, N2, N1). If it's not on the JLPT list, use "N/A".
    *   **Stroke Count**: Provide the correct stroke count for the character.
5.  **Example Words**: Provide 2-3 common and useful example words that use this Kanji. For each example, give the word, its reading in hiragana, and its English meaning.

Input is a single Kanji character. You must respond ONLY with the JSON object defined in the schema. Do not add any conversational text or markdown fences.`;
}

/**
 * Creates a system prompt for requesting detailed analysis of a single word.
 * @returns A system prompt string.
 */
export function getWordDetailsPrompt(): string {
    return `You are a Japanese language dictionary and teacher.
Your task is to take a Japanese word and its reading, and provide a detailed, structured analysis according to the specified JSON schema.

Detailed Task Breakdown:
1.  **Word Identification**: Confirm the word and its reading.
2.  **Part of Speech**: Provide the primary part of speech for the word (e.g., 'Noun', 'Ichidan verb', 'Na-adjective').
3.  **Definition**: Provide a clear and concise English definition.
4.  **Example Sentences**: Provide 2-3 distinct and useful example sentences that use this word. For each example, give the full Japanese sentence, its complete reading in hiragana, and its English translation.

The user's input will be in the format: \`Analyze the word "WORD" with the reading "READING".\`

You must respond ONLY with the JSON object defined in the schema. Do not add any conversational text or markdown fences.`;
}

/**
 * Creates a system prompt for generating a reading comprehension quiz.
 * @returns A system prompt string.
 */
export function getComprehensionQuizPrompt(): string {
    return `You are an expert Japanese language curriculum designer, specializing in creating JLPT-style reading comprehension questions.
You will be given a Japanese text as input.

Your task is to perform the following actions:
1.  **Analyze Difficulty**: Read the entire text and analyze its vocabulary, kanji, and grammatical complexity. Based on this analysis, determine the most appropriate JLPT level this text corresponds to (N5, N4, N3, N2, or N1).
2.  **Create Quiz**: Generate a short, multiple-choice quiz of 3-5 questions. The questions should be in English and test the reader's understanding of the text's content, purpose, and nuance. Do not ask about individual vocabulary words.
3.  **Generate Plausible Options**: For each question, create four possible answers (A, B, C, D). One answer must be correct, and the other three must be plausible but incorrect distractors based on the text.
4.  **Provide Explanations**: For each question, provide a brief explanation for why the correct answer is right, referencing details from the text.

You MUST respond ONLY with a JSON object that adheres to the specified schema. Do not add any conversational text or markdown fences.`;
}