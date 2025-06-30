
// ui/handlers.ts
import { loadSpeechSynthesisVoices } from '../services/tts.ts';
import { setupSmartTooltip, hideTooltip } from './tooltip.ts';
import { setupModal } from './modal.ts';
import { initializeSettings } from './controllers/settings.ts';
import { initializeHistory } from './controllers/history.ts';
import { initializeMainController } from './controllers/main.ts';
import { applyDisplayOptions } from './view.ts';
import { initializeBottomSheet, hideBottomSheet } from './bottomSheet.ts';

// LocalStorage Keys
export const HISTORY_KEY = 'japanese-analyzer-history-v2';
export const UNSAVED_TITLE_KEY = 'japanese-analyzer-unsaved-title';
export const UNSAVED_TEXT_KEY = 'japanese-analyzer-unsaved-text';
export const ANALYSIS_DEPTH_KEY = 'japanese-analyzer-analysis-depth';
export const API_KEY_KEY = 'japanese-analyzer-api-key';
export const THEME_KEY = 'theme';
export const FURIGANA_HIDDEN_KEY = 'furigana-hidden';
export const COLOR_CODING_HIDDEN_KEY = 'color-coding-hidden';
export const PITCH_ACCENT_HIDDEN_KEY = 'pitch-accent-hidden';
export const FONT_SIZE_KEY = 'japanese-analyzer-font-size';

/** Sets up all event listeners and initializes the application state. */
export function initializeApp() {
    initializeSettings();
    initializeHistory();
    initializeMainController();
    initializeBottomSheet();

    loadSpeechSynthesisVoices();
    setupSmartTooltip();
    setupModal();
    applyDisplayOptions(); // Apply initial display options on load

    // Add resize listener to handle responsive UI changes
    window.addEventListener('resize', () => {
        // If window is now desktop-sized, hide the bottom sheet
        if (window.innerWidth >= 768) {
            hideBottomSheet();
        } else {
            // If window is now mobile-sized, hide the tooltip
            hideTooltip();
        }
    });
}