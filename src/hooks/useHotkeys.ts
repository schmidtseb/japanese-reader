// hotkeys.ts
import { useEffect } from 'react';
import { useAppData, useSettings, useUI, View } from '../contexts/index.ts';

export function useHotkeys() {
    const { state: appDataState, dispatch: appDataDispatch } = useAppData();
    const { state: settingsState, dispatch: settingsDispatch } = useSettings();
    const { state: uiState } = useUI();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
                return;
            }

            // --- Global display toggles ---
            if (event.key.toLowerCase() === 'f') {
                event.preventDefault();
                settingsDispatch({ type: 'UPDATE_SETTINGS', payload: { showFurigana: !settingsState.showFurigana } });
            }
            if (event.key.toLowerCase() === 'c') {
                event.preventDefault();
                settingsDispatch({ type: 'UPDATE_SETTINGS', payload: { showColorCoding: !settingsState.showColorCoding } });
            }

            // --- View-specific hotkeys ---
            switch(appDataState.view) {
                case View.Review:
                    // Review mode hotkeys
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        document.querySelector<HTMLButtonElement>('[data-action="review-exit"]')?.click();
                    }
                    const showAnswerBtn = document.querySelector<HTMLButtonElement>('[data-action="review-show-answer"]');
                    if (showAnswerBtn && (event.code === 'Space' || event.key === ' ')) {
                        event.preventDefault();
                        showAnswerBtn.click();
                    }
                    if (!showAnswerBtn) { // Answer is visible
                        if(event.key === '1') {
                            event.preventDefault();
                            document.querySelector<HTMLButtonElement>('[data-action="review-quality-1"]')?.click();
                        } else if (event.key === '2') {
                            event.preventDefault();
                            document.querySelector<HTMLButtonElement>('[data-action="review-quality-2"]')?.click();
                        } else if (event.key === '3') {
                            event.preventDefault();
                            document.querySelector<HTMLButtonElement>('[data-action="review-quality-3"]')?.click();
                        } else if (event.key === '4') {
                            event.preventDefault();
                            document.querySelector<HTMLButtonElement>('[data-action="review-quality-4"]')?.click();
                        }
                    }
                    return; // Don't process other hotkeys in review mode

                case View.ReadingMode:
                    if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        document.querySelector<HTMLButtonElement>('#reading-nav-next')?.click();
                    } else if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        document.querySelector<HTMLButtonElement>('#reading-nav-prev')?.click();
                    }
                    break;
            }

            // Analysis is visible (Reader or ReadingMode)
            if (appDataState.view === View.Reader || appDataState.view === View.ReadingMode) {
                 if (event.key.toLowerCase() === 't') {
                    const toggleBtn = document.querySelector<HTMLButtonElement>('#toggle-translation-button');
                    if (toggleBtn) {
                        event.preventDefault();
                        toggleBtn.click();
                    }
                }
                if (event.key.toLowerCase() === 's') {
                     const ttsBtn = document.querySelector<HTMLButtonElement>('.tts-button');
                     if (ttsBtn) {
                         event.preventDefault();
                         ttsBtn.click();
                     }
                }
            }

            // Hotkeys for pattern navigation (works in Reader and ReadingMode)
            const visibleAnalysisContainer = document.querySelector('.analysis-view-container, .reading-mode-view');
            if (visibleAnalysisContainer) {
                 const focusedPattern = visibleAnalysisContainer.querySelector<HTMLElement>('.is-focused');
                 if (event.key === 'Escape' && focusedPattern) {
                     event.preventDefault();
                     focusedPattern.classList.remove('is-focused', 'ring-2', 'ring-focus-ring', 'bg-surface-soft');
                     visibleAnalysisContainer.querySelectorAll('.segment').forEach(segment => segment.classList.remove('opacity-30'));
                 }
                
                 const patternNotes = Array.from(visibleAnalysisContainer.querySelectorAll<HTMLElement>('[data-pattern-id]'));
                 if (patternNotes.length > 0) {
                     const focusedIndex = patternNotes.findIndex(note => note.classList.contains('is-focused'));

                     if (event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k') {
                         event.preventDefault();
                         let nextIndex = (focusedIndex === -1) ? 0 : (event.key === 'j' ? focusedIndex + 1 : focusedIndex - 1);
                         if (nextIndex >= patternNotes.length) nextIndex = 0;
                         if (nextIndex < 0) nextIndex = patternNotes.length - 1;
                         
                         patternNotes[nextIndex]?.click();
                     }

                     if (event.key.toLowerCase() === 'e' && focusedPattern) {
                         event.preventDefault();
                         focusedPattern.querySelector<HTMLButtonElement>('.show-examples-button')?.click();
                     }
                 }
            }

        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [appDataState, settingsState, appDataDispatch, settingsDispatch]);
}