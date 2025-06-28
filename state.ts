
// state.ts
export type AnalysisDepth = 'low' | 'medium' | 'high';
export const depthLevels: AnalysisDepth[] = ['low', 'medium', 'high'];

export interface TextEntry {
    id: string;
    title: string;
    text: string;
    createdAt: number;
    updatedAt: number;
    readingProgress: number; // Index of the last read sentence
    // Cache structure: { [sentence: string]: { [depth in AnalysisDepth]?: any } }
    analyzedSentences: Record<string, Partial<Record<AnalysisDepth, any>>>;
}

export let japaneseVoice: SpeechSynthesisVoice | null = null;
export let textHistory: TextEntry[] = [];
export let currentTextEntryId: string | null = null;
export let analysisDepth: AnalysisDepth = 'medium';
export let apiKey: string | null = null;

export let jumpToSentenceButton: HTMLButtonElement | null = null;
export let analysisHeaderObserver: IntersectionObserver | null = null;
export let readingModeScrollListener: (() => void) | null = null;

// Functions to modify state
export function setJapaneseVoice(voice: SpeechSynthesisVoice | null) {
    japaneseVoice = voice;
}

export function setApiKey(key: string | null) {
    apiKey = key;
}

export function setJumpButton(button: HTMLButtonElement | null) {
    jumpToSentenceButton = button;
}

export function setAnalysisHeaderObserver(observer: IntersectionObserver | null) {
    analysisHeaderObserver = observer;
}

export function setReadingModeScrollListener(listener: (() => void) | null) {
    readingModeScrollListener = listener;
}

export function setCurrentTextEntryId(id: string | null) {
    currentTextEntryId = id;
}

export function setAnalysisDepth(depth: AnalysisDepth) {
    analysisDepth = depth;
}


// --- History State Management ---

export function setTextHistory(history: TextEntry[]) {
    textHistory = history;
}

export function findTextEntryById(id: string): TextEntry | undefined {
    return textHistory.find(entry => entry.id === id);
}

export function addOrUpdateTextEntry(entry: TextEntry) {
    const existingIndex = textHistory.findIndex(e => e.id === entry.id);
    if (existingIndex > -1) {
        // Replace existing entry
        textHistory[existingIndex] = entry;
    } else {
        // Add new entry to the beginning
        textHistory.unshift(entry);
    }
}

export function updateReadingProgress(id: string, progress: number) {
    const entry = findTextEntryById(id);
    if (entry) {
        entry.readingProgress = progress;
        entry.updatedAt = Date.now();
        addOrUpdateTextEntry(entry);
    }
}

export function addAnalysisToCurrentText(sentence: string, analysis: any, depth: AnalysisDepth) {
    if (!currentTextEntryId) return;
    const entry = findTextEntryById(currentTextEntryId);
    if (entry) {
        if (!entry.analyzedSentences[sentence]) {
            entry.analyzedSentences[sentence] = {};
        }
        entry.analyzedSentences[sentence][depth] = analysis;
        entry.updatedAt = Date.now();
        addOrUpdateTextEntry(entry); // Ensure the update is reflected and moves entry to top
    }
}

export function removeTextEntry(id: string) {
    textHistory = textHistory.filter(entry => entry.id !== id);
}

export function clearAllHistory() {
    textHistory = [];
}
