// ui/controllers/main.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';
import { getExampleSentences } from '../../services/gemini.ts';
import { createFuriganaHTML } from '../components.ts';
import { setupJumpButtonAndObserver } from '../jumpButton.ts';
import { hideTooltip, isTooltipPinnedFor, pinTooltipFor } from '../tooltip.ts';
import { renderSingleAnalysis, renderAnalysisPlaceholder } from '../render/analysis.ts';
import { renderReaderView } from '../render/reader.ts';
import { renderHistoryPanel } from '../render/history.ts';
import { showError } from '../render/common.ts';
import { applyDisplayOptions, formatApiError, updateProcessButtonState, resetToNewTextView } from '../view.ts';
import { performAndCacheAnalysis, startReadingMode, loadTextEntry } from '../actions.ts';
import { showBottomSheetForSegment, hideBottomSheet } from '../bottomSheet.ts';
import { UNSAVED_TITLE_KEY, UNSAVED_TEXT_KEY } from '../../constants.ts';
import { saveHistory } from './history.ts';


/** Toggles the visibility of the translation content and updates the button state. */
function toggleSentenceTranslation(button: HTMLButtonElement) {
    const viewContainer = button.closest('#analysis-view, #reading-mode-view');
    if (!viewContainer) return;
    
    const content = viewContainer.querySelector<HTMLElement>('#sentence-translation-content');
    if (!content) return;

    const isHidden = content.classList.contains('hidden');
    content.classList.toggle('hidden');
    button.setAttribute('aria-pressed', String(!isHidden));
    // Add a visual indicator to the button when it's active
    button.classList.toggle('bg-accent-subtle-bg', !isHidden);
}

function setupProcessButtonListener() {
    dom.button.addEventListener('click', async () => {
        const text = dom.sentenceInput.value;
        if (!text.trim()) {
            showError('Input Required', 'main', 'Please enter some Japanese text to process.');
            return;
        }
        
        const title = dom.textTitleInput.value.trim() || text.substring(0, 40) + '...';
        let currentEntryId = state.currentTextEntryId;
        
        if (currentEntryId) {
            const entryToUpdate = state.findTextEntryById(currentEntryId);
            if (entryToUpdate) {
                const getSentences = (t: string): Set<string> => new Set(t.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []));
                
                const oldSentences = getSentences(entryToUpdate.text);
                const newSentences = getSentences(text);
                const oldCache = entryToUpdate.analyzedSentences;
                const newCache: typeof oldCache = {};

                for (const sentence of newSentences) {
                    if (oldSentences.has(sentence) && oldCache[sentence]) {
                        newCache[sentence] = oldCache[sentence];
                    }
                }
                
                entryToUpdate.title = title;
                entryToUpdate.text = text;
                entryToUpdate.analyzedSentences = newCache;
                entryToUpdate.updatedAt = Date.now();
                entryToUpdate.readingProgress = 0;

                state.addOrUpdateTextEntry(entryToUpdate);
            } else { currentEntryId = null; }
        }
        
        if (!currentEntryId) {
            const entryId = Date.now().toString();
            const newEntry: state.TextEntry = {
                id: entryId, title, text, createdAt: Date.now(), updatedAt: Date.now(), analyzedSentences: {}, readingProgress: 0,
            };
            state.addOrUpdateTextEntry(newEntry);
            state.setCurrentTextEntryId(entryId);
        }
        
        saveHistory();
        renderHistoryPanel();
        localStorage.setItem(UNSAVED_TITLE_KEY, title);
        localStorage.setItem(UNSAVED_TEXT_KEY, text);
        
        const currentEntry = state.findTextEntryById(state.currentTextEntryId!)!;
        renderReaderView(currentEntry);
        dom.inputArea.classList.add('hidden');
        dom.analysisView.innerHTML = `<p class="text-center p-8 text-text-muted">Select a sentence to analyze, or start reading mode.</p>`;
    });
}

function setupMainViewListeners() {
    dom.resultContainer.addEventListener('click', async (event) => {
        if (!dom.readingModeView.classList.contains('hidden')) return;
        const target = event.target as HTMLElement;

        const reanalyzeBtn = target.closest('#re-analyze-button');
        if (reanalyzeBtn) {
            const sentenceEl = dom.readerView.querySelector<HTMLElement>('.clickable-sentence.selected');
            const sentence = sentenceEl?.dataset.sentence;

            if (!sentence || !state.currentTextEntryId) return;

            // Remove the analysis from the cache to force a re-fetch.
            const currentEntry = state.findTextEntryById(state.currentTextEntryId)!;
            if (currentEntry.analyzedSentences[sentence]) {
                delete currentEntry.analyzedSentences[sentence][state.analysisDepth];
            }

            // Simulate a click on the sentence to trigger the analysis flow,
            // which now includes the placeholder and smooth transition.
            sentenceEl.click();
            return;
        }

        const toggleTranslationBtn = target.closest('#toggle-translation-button');
        if (toggleTranslationBtn) {
            toggleSentenceTranslation(toggleTranslationBtn as HTMLButtonElement);
            return;
        }

        if (target.closest('#start-reading-button')) {
            if (state.currentTextEntryId) {
                const entry = state.findTextEntryById(state.currentTextEntryId);
                if (entry) await startReadingMode(entry, entry.readingProgress);
            }
            return;
        }
        
        if (target.closest('#edit-text-button')) {
            dom.inputArea.classList.remove('hidden');
            dom.readerView.innerHTML = '';
            dom.analysisView.innerHTML = '';
            dom.inputArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const sentenceEl = target.closest<HTMLElement>('.clickable-sentence');
        if (sentenceEl && dom.readerView.contains(sentenceEl)) {
            const sentence = sentenceEl.dataset.sentence;
            if (!sentence || !state.currentTextEntryId) return;

            // Update reading progress to match the clicked sentence
            const currentEntryForProgress = state.findTextEntryById(state.currentTextEntryId);
            if (currentEntryForProgress) {
                const allSentences = currentEntryForProgress.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
                const sentenceIndex = allSentences.indexOf(sentence);
                if (sentenceIndex !== -1) {
                    state.updateReadingProgress(currentEntryForProgress.id, sentenceIndex);
                    saveHistory(); // Persist the progress update
                }
            }

            hideTooltip();
            hideBottomSheet();
            dom.readerView.querySelectorAll('.clickable-sentence').forEach(el => el.classList.remove('selected', 'bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30', 'font-semibold'));
            sentenceEl.classList.add('selected', 'bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30', 'font-semibold');
            
            const currentEntry = state.findTextEntryById(state.currentTextEntryId)!;
            const analysis = currentEntry.analyzedSentences[sentence]?.[state.analysisDepth];
            
            if (analysis) {
                renderSingleAnalysis(dom.analysisView, analysis);
                setupJumpButtonAndObserver();
                dom.analysisView.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                renderAnalysisPlaceholder(dom.analysisView, sentence);
                dom.analysisView.scrollIntoView({ behavior: 'smooth', block: 'start' });
                try {
                    const result = await performAndCacheAnalysis(currentEntry, sentence, state.analysisDepth);
                    
                    const container = dom.analysisView;
                    container.style.transition = 'opacity 0.2s ease-in-out';
                    container.style.opacity = '0';
                    
                    await new Promise(resolve => setTimeout(resolve, 200));

                    renderSingleAnalysis(dom.analysisView, result);
                    setupJumpButtonAndObserver();
                    
                    renderReaderView(currentEntry); 
                    dom.readerView.querySelector<HTMLElement>(`.clickable-sentence[data-sentence="${CSS.escape(sentence)}"]`)?.classList.add('selected', 'bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30', 'font-semibold');
                    
                    container.style.opacity = '1';
                    
                    setTimeout(() => { container.style.transition = ''; }, 250);

                } catch(e) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    const { main, detail } = formatApiError(error);
                    showError(main, 'analysis', detail);
                    dom.analysisView.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
            applyDisplayOptions();
            return;
        }

        if (target.closest('a.underline')) { event.stopPropagation(); return; }
        
        const segment = target.closest<HTMLElement>('.segment');
        if (segment && dom.analysisView.contains(segment)) {
            event.stopPropagation(); 
            if (dom.analysisView.querySelector('.is-focused')) return;
            
            if (window.innerWidth < 768) { // Mobile
                showBottomSheetForSegment(segment);
            } else { // Desktop
                isTooltipPinnedFor(segment) ? hideTooltip() : pinTooltipFor(segment);
            }
        }
    });
}

function setupReadingModeListeners() {
    dom.resultContainer.addEventListener('click', (event) => {
        if (dom.readingModeView.classList.contains('hidden')) return;
        const target = event.target as HTMLElement;

        const reanalyzeBtn = target.closest('#re-analyze-button');
        if (reanalyzeBtn) {
            if (!state.currentTextEntryId) return;
            const entry = state.findTextEntryById(state.currentTextEntryId);
            if (!entry) return;

            const sentenceIndex = entry.readingProgress;
            const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
            const sentence = sentences[sentenceIndex];
            
            if (entry.analyzedSentences[sentence]) {
                delete entry.analyzedSentences[sentence][state.analysisDepth];
            }
            saveHistory(); // persist cache deletion

            startReadingMode(entry, sentenceIndex);
            return;
        }
        
        const headerToggleBtn = target.closest('#reading-header-toggle');
        if (headerToggleBtn) {
            const header = document.getElementById('reading-mode-header');
            if (header) {
                const isNowCollapsed = header.classList.toggle('header-collapsed');
                headerToggleBtn.classList.toggle('is-open', !isNowCollapsed);
            }
            return;
        }

        const toggleTranslationBtn = target.closest('#toggle-translation-button');
        if (toggleTranslationBtn) {
            toggleSentenceTranslation(toggleTranslationBtn as HTMLButtonElement);
            return;
        }

        const segment = target.closest<HTMLElement>('.segment');
        if (segment && dom.readingModeView.contains(segment)) {
            event.stopPropagation();
            if (window.innerWidth < 768) {
                showBottomSheetForSegment(segment);
            } else {
                isTooltipPinnedFor(segment) ? hideTooltip() : pinTooltipFor(segment);
            }
            return;
        }
        
        const entryId = state.currentTextEntryId;
        if (!entryId) return;
        const entry = state.findTextEntryById(entryId);
        if (!entry) return;
        let currentIndex = entry.readingProgress;

        if (target.closest('#reading-mode-exit')) {
            hideBottomSheet();
            loadTextEntry(entryId);
            return;
        }
        if (target.closest('#reading-nav-next')) { currentIndex++; }
        else if (target.closest('#reading-nav-prev')) { currentIndex--; }
        else { return; }

        hideBottomSheet();
        state.updateReadingProgress(entryId, currentIndex);
        saveHistory();
        startReadingMode(entry, currentIndex);
    });

    dom.resultContainer.addEventListener('change', (event) => {
        if (dom.readingModeView.classList.contains('hidden')) return;
        const target = event.target as HTMLInputElement;
        if (target.id !== 'reading-mode-sentence-input') return;

        const entryId = state.currentTextEntryId;
        if (!entryId) return;
        const entry = state.findTextEntryById(entryId);
        if (!entry) return;

        const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
        const totalSentences = sentences.length;
        let newIndex = parseInt(target.value, 10) - 1;
        
        if (isNaN(newIndex) || newIndex < 0 || newIndex >= totalSentences) {
            target.value = String(entry.readingProgress + 1);
            return;
        }
        if (newIndex !== entry.readingProgress) {
            hideBottomSheet();
            state.updateReadingProgress(entryId, newIndex);
            saveHistory();
            startReadingMode(entry, newIndex);
        }
    });
}

function setupReadingModeSwipeControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const SWIPE_THRESHOLD = 50; // Minimum distance in pixels for a swipe
    const MAX_VERTICAL_DEVIATION = 40; // Max vertical movement in pixels to still be considered horizontal swipe

    dom.resultContainer.addEventListener('touchstart', (e) => {
        // Only listen for swipes in reading mode
        if (dom.readingModeView.classList.contains('hidden')) {
            return;
        }
        // Only track single-finger touches
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            // Reset end coordinates
            touchEndX = touchStartX;
            touchEndY = touchStartY;
        }
    }, { passive: true });

    dom.resultContainer.addEventListener('touchmove', (e) => {
        if (dom.readingModeView.classList.contains('hidden') || e.touches.length !== 1) {
            return;
        }
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
    }, { passive: true });

    dom.resultContainer.addEventListener('touchend', () => {
        if (dom.readingModeView.classList.contains('hidden')) {
            return;
        }

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Check for a valid horizontal swipe
        if (absDeltaX > SWIPE_THRESHOLD && absDeltaY < MAX_VERTICAL_DEVIATION) {
            if (deltaX < 0) {
                // Swipe Left: Go to Next Sentence
                const nextButton = document.getElementById('reading-nav-next') as HTMLButtonElement;
                if (nextButton && !nextButton.disabled) {
                    nextButton.click();
                }
            } else {
                // Swipe Right: Go to Previous Sentence
                const prevButton = document.getElementById('reading-nav-prev') as HTMLButtonElement;
                if (prevButton && !prevButton.disabled) {
                    prevButton.click();
                }
            }
        }

        // Reset start coordinates for the next touch
        touchStartX = 0;
        touchStartY = 0;
    });
}

function setupPatternFocusHandler() {
    dom.resultContainer.addEventListener('click', (event) => {
        const noteItem = (event.target as HTMLElement).closest<HTMLElement>('[data-pattern-id]');
        if (!noteItem) return;

        const currentAnalysisView = noteItem.closest<HTMLElement>('#analysis-view, #reading-mode-view');
        if (!currentAnalysisView) return;

        const { patternId } = noteItem.dataset;
        if (!patternId) return;

        const isAlreadyFocused = noteItem.classList.contains('is-focused');

        currentAnalysisView.querySelectorAll('[data-pattern-id]').forEach(item => item.classList.remove('is-focused', 'ring-2', 'ring-focus-ring', 'bg-surface-soft'));
        currentAnalysisView.querySelectorAll('.segment').forEach(segment => segment.classList.remove('opacity-30'));
        
        if (!isAlreadyFocused) {
            noteItem.classList.add('is-focused', 'ring-2', 'ring-focus-ring', 'bg-surface-soft');
            const segmentsToDim = currentAnalysisView.querySelectorAll(`.segment:not(.${patternId})`);
            segmentsToDim.forEach(segment => segment.classList.add('opacity-30'));
        }
    });
}

function setupExampleSentenceHandler() {
    dom.resultContainer.addEventListener('click', async (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.show-examples-button');
        if (!button || button.disabled) return;
        event.preventDefault();

        if (!state.apiKey) {
            showError("API Key Not Found", 'analysis', "Please add your Gemini API key in the settings menu to generate examples.");
            return;
        }

        const { patternName } = button.dataset;
        const textSpan = button.querySelector<HTMLSpanElement>('.button-text');
        if (!textSpan) return;

        const examplesContainer = button.nextElementSibling;
        if (examplesContainer && examplesContainer.classList.contains('examples-container')) {
            examplesContainer.classList.toggle('hidden');
            textSpan.textContent = examplesContainer.classList.contains('hidden') ? 'Examples' : 'Hide';
            return;
        }

        button.disabled = true;
        const originalContent = button.innerHTML;
        button.innerHTML = '<span class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span><span class="button-text">Loading...</span>';

        try {
            const examples = await getExampleSentences(state.apiKey, patternName!);
            
            button.innerHTML = originalContent; // Restore icon
            const newTextSpan = button.querySelector('.button-text')!;

            if (examples?.length > 0) {
                const newExamplesContainer = document.createElement('div');
                newExamplesContainer.className = 'examples-container mt-4 pt-4 border-t border-dashed border-border-subtle';
                const list = document.createElement('dl');
                list.className = 'flex flex-col gap-4';
                examples.forEach((ex: any) => {
                    const dt = document.createElement('dt');
                    const dd = document.createElement('dd');
                    const furiganaHtml = createFuriganaHTML(ex.japanese, ex.reading, false);
                    dt.innerHTML = `<span class="text-lg font-jp">${furiganaHtml}</span>`;
                    dd.className = 'text-sm text-text-muted -mt-1';
                    dd.textContent = ex.english;
                    list.append(dt, dd);
                });
                newExamplesContainer.appendChild(list);
                button.insertAdjacentElement('afterend', newExamplesContainer);
                newTextSpan.textContent = 'Hide';
            } else { 
                newTextSpan.textContent = 'No examples';
             }
        } catch (error) {
            console.error(error);
            button.innerHTML = originalContent;
            button.querySelector('.button-text')!.textContent = 'Error';
        } finally {
            button.disabled = false;
            applyDisplayOptions();
        }
    });
}

function setupNewTextButton() {
    dom.newTextButton.addEventListener('click', () => {
        // Clear unsaved text when starting a new document
        localStorage.removeItem(UNSAVED_TITLE_KEY);
        localStorage.removeItem(UNSAVED_TEXT_KEY);
        resetToNewTextView()
    });
}

/** Saves the text input to localStorage as the user types. */
function setupTextPersistence() {
    dom.textTitleInput.value = localStorage.getItem(UNSAVED_TITLE_KEY) || '';
    dom.sentenceInput.value = localStorage.getItem(UNSAVED_TEXT_KEY) || '';

    dom.textTitleInput.addEventListener('input', () => {
        localStorage.setItem(UNSAVED_TITLE_KEY, dom.textTitleInput.value);
    });

    dom.sentenceInput.addEventListener('input', () => {
        localStorage.setItem(UNSAVED_TEXT_KEY, dom.sentenceInput.value);
        updateProcessButtonState();
    });
}

export function initializeMainController() {
    setupTextPersistence();
    setupProcessButtonListener();
    setupMainViewListeners();
    setupReadingModeListeners();
    setupReadingModeSwipeControls();
    setupPatternFocusHandler();
    setupExampleSentenceHandler();
    setupNewTextButton();
}