// hotkeys.ts
import * as dom from './dom.ts';
import * as state from './state.ts';

/** Sets up all global hotkey event listeners. */
export function initializeHotkeys() {
    document.addEventListener('keydown', (event) => {
        const target = event.target as HTMLElement;
        // Ignore hotkeys if user is typing in an input field
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
            return;
        }

        // --- Global display toggles ---
        if (event.key.toLowerCase() === 'f') {
            event.preventDefault();
            dom.furiganaCheckbox.click(); // This will trigger the change event
        }
        if (event.key.toLowerCase() === 'c') {
            event.preventDefault();
            dom.colorCodingCheckbox.click(); // This will trigger the change event
        }

        const isReadingMode = !dom.readingModeView.classList.contains('hidden');
        const visibleAnalysisContainer = isReadingMode ? dom.readingModeView : (dom.analysisView.innerHTML.trim() ? dom.analysisView : null);

        // --- Reading Mode Navigation ---
        if (isReadingMode) {
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                (document.getElementById('reading-nav-next') as HTMLButtonElement)?.click();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                (document.getElementById('reading-nav-prev') as HTMLButtonElement)?.click();
            }
        }

        if (!visibleAnalysisContainer) return;

        // --- Global Hotkeys (when analysis is visible) ---
        if (event.key.toLowerCase() === 't') {
            const toggleBtn = visibleAnalysisContainer.querySelector<HTMLButtonElement>('#toggle-translation-button');
            if (toggleBtn) {
                event.preventDefault();
                toggleBtn.click();
            }
        }

        if (event.key.toLowerCase() === 's') {
             const ttsBtn = visibleAnalysisContainer.querySelector<HTMLButtonElement>('.tts-button');
             if (ttsBtn) {
                 event.preventDefault();
                 ttsBtn.click();
             }
        }

        const focusedPattern = visibleAnalysisContainer.querySelector<HTMLElement>('.is-focused');
        if (event.key === 'Escape' && focusedPattern) {
            event.preventDefault();
            focusedPattern.classList.remove('is-focused', 'ring-2', 'ring-focus-ring', 'bg-surface-soft');
            visibleAnalysisContainer.querySelectorAll('.segment').forEach(segment => segment.classList.remove('opacity-30'));
        }

        // --- Pattern Navigation Hotkeys ---
        const patternNotes = Array.from(visibleAnalysisContainer.querySelectorAll<HTMLElement>('[data-pattern-id]'));
        if (patternNotes.length > 0) {
             const focusedIndex = patternNotes.findIndex(note => note.classList.contains('is-focused'));

             if (event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k') {
                 event.preventDefault();
                 let nextIndex = (focusedIndex === -1) ? 0 : (event.key === 'j' ? focusedIndex + 1 : focusedIndex - 1);
                 if (nextIndex >= patternNotes.length) nextIndex = 0;
                 if (nextIndex < 0) nextIndex = patternNotes.length - 1;
                 
                 const targetNote = patternNotes[nextIndex];
                 if (!targetNote) return;

                 targetNote.click();
                 
                 // Custom scroll logic to account for the sticky header
                 const stickyHeader = visibleAnalysisContainer.querySelector<HTMLElement>('.sticky');
                 const headerBottom = stickyHeader ? stickyHeader.getBoundingClientRect().bottom : 0;
                 const targetRect = targetNote.getBoundingClientRect();
                 const viewportHeight = window.innerHeight;

                 const visibleHeight = viewportHeight - headerBottom;
                 let idealTopInViewport: number;
                 const PADDING = 20; // px

                 // If element is taller than the visible area, just align its top.
                 if (targetRect.height > visibleHeight) {
                    idealTopInViewport = headerBottom + PADDING;
                 } else {
                    // Otherwise, center it in the available space.
                    idealTopInViewport = headerBottom + (visibleHeight / 2) - (targetRect.height / 2);
                 }

                 const scrollOffset = targetRect.top - idealTopInViewport;
                 
                 window.scrollBy({
                     top: scrollOffset,
                     left: 0,
                     behavior: 'smooth'
                 });
             }

             if (event.key.toLowerCase() === 'e' && focusedPattern) {
                 event.preventDefault();
                 const examplesBtn = focusedPattern.querySelector<HTMLButtonElement>('.show-examples-button');
                 examplesBtn?.click();
             }
        }
    });
}
