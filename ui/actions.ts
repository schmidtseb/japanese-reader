// ui/actions.ts
import * as dom from '../dom.ts';
import * as state from '../state.ts';
import { analyzeSentence } from '../services/gemini.ts';
import { renderSingleAnalysis } from './render/analysis.ts';
import { renderReaderView, renderReadingModeView, renderReadingModeLoading } from './render/reader.ts';
import { renderHistoryPanel } from './render/history.ts';
import { applyDisplayOptions, updateProcessButtonState, switchToMainView, switchToReadingMode, formatApiError, resetToNewTextView } from './view.ts';
import { showError } from './render/common.ts';
import { hideTooltip } from './tooltip.ts';
import { ensureJumpButtonExists } from './jumpButton.ts';
import { saveHistory } from './controllers/history.ts';
import { createErrorComponent } from './components.ts';

const analysisInProgress = new Set<string>();

/** Fetches analysis for a sentence if not already cached, and saves it. */
export async function performAndCacheAnalysis(entry: state.TextEntry, sentence: string, depth: state.AnalysisDepth): Promise<any> {
    const cachedAnalysis = entry.analyzedSentences[sentence]?.[depth];
    if (cachedAnalysis) {
        return cachedAnalysis;
    }

    if (!state.apiKey) {
        throw new Error("API Key is not configured. Please add one in the settings menu.");
    }
    
    // Sanitize the sentence before sending it to the API.
    // This removes leading/trailing Japanese quotes and trims whitespace.
    const sanitizedSentence = sentence.trim().replace(/^[「『]/, '').replace(/[」』]$/, '').trim();

    // If the sentence becomes empty after sanitization (e.g., it was just "「」"),
    // return a mock analysis instead of calling the API.
    if (!sanitizedSentence) {
        const mockAnalysis = {
            original_japanese_sentence: sentence,
            analysis: [{
                japanese_segment: sentence,
                reading: sentence,
                category: 'PUNCTUATION',
                english_equivalent: 'Punctuation/Quotes',
                pitch_accent: ''
            }],
            grammar_patterns: [],
            english_translation: '(Sentence consists only of punctuation)'
        };
        // Still cache this mock analysis to avoid re-processing
        state.addAnalysisToCurrentText(sentence, mockAnalysis, depth);
        saveHistory();
        return Promise.resolve(mockAnalysis);
    }
    
    try {
        const result = await analyzeSentence(state.apiKey, sanitizedSentence.trim(), depth);
        
        // The API analyzed the sanitized sentence, so we must restore the original
        // sentence in the final result object for consistency.
        result.original_japanese_sentence = sentence;
        
        state.addAnalysisToCurrentText(sentence, result, depth);
        saveHistory();
        renderHistoryPanel();
        
        return result;
    } catch (error) {
        console.error(`Analysis failed for: "${sentence}"`, error);
        // Do not cache the error. Just re-throw to be handled by the UI function.
        // This allows the user to try analyzing the same sentence again.
        throw error;
    }
}

/** Fetches analysis for the next sentence in the background. */
async function prefetchNextSentenceAnalysis(entry: state.TextEntry, currentIndex: number) {
    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
    const nextIndex = currentIndex + 1;

    if (nextIndex < sentences.length) {
        const nextSentence = sentences[nextIndex];
        if (!entry.analyzedSentences[nextSentence]?.[state.analysisDepth]) {
            console.log(`Prefetching analysis for: "${nextSentence}"`);
            performAndCacheAnalysis(entry, nextSentence, state.analysisDepth).catch(err => {
                console.warn(`Prefetch failed for sentence ${nextIndex + 1}:`, err.message);
            });
        }
    }
}

/** Initializes and displays the Reading Mode UI for a given text entry and sentence. */
export async function startReadingMode(entry: state.TextEntry, sentenceIndex: number) {
    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
    if (sentenceIndex < 0 || sentenceIndex >= sentences.length || sentences.length === 0) {
        loadTextEntry(entry.id);
        return;
    }

    const sentence = sentences[sentenceIndex];
    
    switchToReadingMode();
    const analysis = entry.analyzedSentences[sentence]?.[state.analysisDepth];

    if (analysis) {
        renderReadingModeView(entry, sentenceIndex, analysis);
    } else {
        renderReadingModeLoading(entry, sentenceIndex);
    }
    
    // Common setup logic after initial render
    window.scrollTo({ top: 0, behavior: 'auto' });
    applyDisplayOptions();

    if (state.analysisHeaderObserver) state.analysisHeaderObserver.disconnect();
    if (state.readingModeScrollListener) window.removeEventListener('scroll', state.readingModeScrollListener);
    
    ensureJumpButtonExists();
    const button = state.jumpToSentenceButton;
    if (button) {
        button.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        button.title = 'Scroll to top';
        button.classList.add('opacity-0', 'invisible', 'translate-y-5');

        const scrollHandler = () => {
            if (dom.readingModeView.classList.contains('hidden')) return;
            const shouldBeVisible = window.scrollY > window.innerHeight / 2;
            button.classList.toggle('opacity-0', !shouldBeVisible);
            button.classList.toggle('invisible', !shouldBeVisible);
            button.classList.toggle('translate-y-5', !shouldBeVisible);
        };
        
        window.addEventListener('scroll', scrollHandler);
        state.setReadingModeScrollListener(scrollHandler);
    }
    
    // Fetch if needed
    if (!analysis) {
        if (analysisInProgress.has(sentence)) {
            console.log(`Analysis for "${sentence}" is already in progress.`);
            return;
        }

        try {
            analysisInProgress.add(sentence);
            const result = await performAndCacheAnalysis(entry, sentence, state.analysisDepth);
            
            // Check if we are still on the same page before rendering
            const currentSentenceInput = dom.readingModeView.querySelector<HTMLInputElement>('#reading-mode-sentence-input');
            if (currentSentenceInput && parseInt(currentSentenceInput.value, 10) === sentenceIndex + 1) {
                dom.readingModeView.style.transition = 'opacity 0.2s ease-in-out';
                dom.readingModeView.style.opacity = '0';
                
                await new Promise(resolve => setTimeout(resolve, 200));

                // Re-render the entire reading mode view with the new analysis data
                renderReadingModeView(entry, sentenceIndex, result);
                applyDisplayOptions();
                
                // Fade the new content back in
                dom.readingModeView.style.opacity = '1';
                setTimeout(() => { dom.readingModeView.style.transition = ''; }, 250);
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error('An unknown error occurred during analysis.');
            const { main, detail } = formatApiError(err);

            const contentWrapper = dom.readingModeView.querySelector<HTMLElement>('#reading-mode-content-wrapper');
            if (contentWrapper) {
                 contentWrapper.innerHTML = createErrorComponent(main, detail);
            } else {
                showError(main, 'main', detail); // Fallback
            }
        } finally {
            analysisInProgress.delete(sentence);
        }
    }
    
    // Always try to prefetch next
    await prefetchNextSentenceAnalysis(entry, sentenceIndex);
}

/** Loads a text entry into the main editor view. */
export function loadTextEntry(id: string) {
    const entry = state.findTextEntryById(id);
    if (!entry) return;

    switchToMainView();
    dom.inputArea.classList.add('hidden');

    dom.textTitleInput.value = entry.title;
    dom.sentenceInput.value = entry.text;
    
    state.setCurrentTextEntryId(id);

    renderReaderView(entry);
    dom.analysisView.innerHTML = `<p class="text-center p-8 text-slate-500">Select a sentence to analyze, or start reading mode.</p>`;
    updateProcessButtonState();
}