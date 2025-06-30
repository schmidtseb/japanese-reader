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
import { UNSAVED_TITLE_KEY, UNSAVED_TEXT_KEY } from '../handlers.ts';
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

        if (target.closest('#reading-mode-exit')) { loadTextEntry(entryId); return; }
        if (target.closest('#reading-nav-next')) { currentIndex++; }
        else if (target.closest('#reading-nav-prev')) { currentIndex--; }
        else { return; }

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
            state.updateReadingProgress(entryId, newIndex);
            saveHistory();
            startReadingMode(entry, newIndex);
        }
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

function setupHotkeys() {
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

export function initializeMainController() {
    setupTextPersistence();
    setupProcessButtonListener();
    setupMainViewListeners();
    setupReadingModeListeners();
    setupPatternFocusHandler();
    setupExampleSentenceHandler();
    setupNewTextButton();
    setupHotkeys();
}