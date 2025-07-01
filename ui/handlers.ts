// ui/handlers.ts
import { loadSpeechSynthesisVoices } from '../services/tts.ts';
import { setupSmartTooltip, hideTooltip } from './tooltip.ts';
import { setupModal } from './modal.ts';
import { initializeSettings } from './controllers/settings.ts';
import { initializeHistory } from './controllers/history.ts';
import { initializeMainController } from './controllers/main.ts';
import { initializeHotkeys } from '../hotkeys.ts';
import { applyDisplayOptions } from './view.ts';
import { initializeBottomSheet, hideBottomSheet } from './bottomSheet.ts';


/** Sets up all event listeners and initializes the application state. */
export function initializeApp() {
    // Initialize core features and controllers
    initializeSettings();
    initializeHistory();
    initializeMainController();
    initializeBottomSheet();
    initializeHotkeys();

    // Setup services and UI enhancements
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
