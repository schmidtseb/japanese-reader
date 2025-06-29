
// ui/view.ts
import * as dom from '../dom.ts';
import * as state from '../state.ts';
import { showError } from './render/common.ts';
import { hideTooltip } from './tooltip.ts';

/** Updates visibility of furigana and pitch accent based on checkbox states. */
export function applyDisplayOptions() {
    const isFuriganaHidden = !dom.furiganaCheckbox.checked;
    const isPitchAccentHidden = !dom.pitchAccentCheckbox.checked;
    const isColorCodingHidden = !dom.colorCodingCheckbox.checked;

    dom.resultContainer.classList.toggle('color-coding-disabled', isColorCodingHidden);
    document.querySelectorAll('#result-container rt').forEach(el => el.classList.toggle('hidden', isFuriganaHidden));
    document.querySelectorAll('#result-container .pitch-accent-svg').forEach(el => el.classList.toggle('hidden', isPitchAccentHidden));
    
    document.querySelectorAll('#result-container .segment').forEach(el => {
        el.classList.toggle('pt-[18px]', !isPitchAccentHidden);
        el.classList.toggle('pt-1', isPitchAccentHidden);
    });
}

export function updateProcessButtonState() {
    const hasText = dom.sentenceInput.value.trim().length > 0;
    const hasApiKey = !!state.apiKey;
    dom.button.disabled = !hasText || !hasApiKey;

    if (!hasApiKey) {
        dom.button.title = 'Please set your Gemini API key in the settings menu.';
    } else if (!hasText) {
        dom.button.title = 'Please enter some text to process.';
    } else {
        dom.button.title = '';
    }
}

/** Switches the main content area to show the editor/reader view. */
export function switchToMainView() {
    dom.mainView.classList.remove('hidden');
    dom.readingModeView.classList.add('hidden');
    dom.appHeader.classList.remove('hidden');
}

/** Switches the main content area to show the focused reading mode. */
export function switchToReadingMode() {
    dom.mainView.classList.add('hidden');
    dom.readingModeView.classList.remove('hidden');
    dom.appHeader.classList.add('hidden');
}

/** Creates a user-friendly error message object from a raw error. */
export function formatApiError(error: Error): { main: string, detail?: string } {
    const message = error.message || '';
    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        return {
            main: "The request to the AI model was rate-limited.",
            detail: "This can happen if you process very large texts or make many requests in a short period. The app tried to retry automatically but was unsuccessful. Please wait a moment before trying again."
        };
    }
    if (message.includes('API key not valid')) {
        return {
            main: "The Gemini API key is not valid.",
            detail: "Please check the key in the settings menu. Make sure it has been copied correctly and is enabled for use."
        };
    }
    if (message.includes('timed out')) {
        return {
            main: "The request to the AI model timed out.",
            detail: "This could be due to a temporary network issue or the model taking too long to respond. Please try again in a moment."
        };
    }
    // Generic fallback for other API errors
    if (message.includes('GoogleGenAI') || message.includes('Request failed with status code')) {
         return {
            main: "An unexpected API error occurred.",
            detail: message,
        }
    }
    // For our own thrown errors like "API Key is not configured."
    return {
        main: message,
    };
}

/** Clears the main view and resets state to the default new text view. */
export function resetToNewTextView() {
    dom.textTitleInput.value = '';
    dom.sentenceInput.value = '';
    switchToMainView();
    dom.inputArea.classList.remove('hidden');
    dom.readerView.innerHTML = '';
    dom.analysisView.innerHTML = '';
    
    state.setCurrentTextEntryId(null);
    hideTooltip();
    updateProcessButtonState();
}