// ui/handlers.ts
import { GoogleGenAI } from '@google/genai';
import * as dom from '../dom.ts';
import * as state from '../state.ts';
import { analyzeSentence, getExampleSentences } from '../services/gemini.ts';
import { loadSpeechSynthesisVoices } from '../services/tts.ts';
import { renderSingleAnalysis, renderReaderView, showError, renderHistoryPanel, renderReadingModeView, renderReadingModeLoading } from './render.ts';
import { createFuriganaHTML } from './components.ts';
import { setupSmartTooltip, hideTooltip, pinTooltipFor, isTooltipPinnedFor } from './tooltip.ts';
import { setupJumpButtonAndObserver, ensureJumpButtonExists } from './jumpButton.ts';

// LocalStorage Keys
const HISTORY_KEY = 'japanese-analyzer-history-v2';
const UNSAVED_TITLE_KEY = 'japanese-analyzer-unsaved-title';
const UNSAVED_TEXT_KEY = 'japanese-analyzer-unsaved-text';
const ANALYSIS_DEPTH_KEY = 'japanese-analyzer-analysis-depth';
const API_KEY_KEY = 'japanese-analyzer-api-key';
const THEME_KEY = 'theme';
const FURIGANA_HIDDEN_KEY = 'furigana-hidden';
const PITCH_ACCENT_HIDDEN_KEY = 'pitch-accent-hidden';


/** Updates visibility of furigana and pitch accent based on checkbox states. */
function applyDisplayOptions() {
    const isFuriganaHidden = !dom.furiganaCheckbox.checked;
    const isPitchAccentHidden = !dom.pitchAccentCheckbox.checked;

    document.querySelectorAll('#result-container rt').forEach(el => el.classList.toggle('hidden', isFuriganaHidden));
    document.querySelectorAll('#result-container .pitch-accent-svg').forEach(el => el.classList.toggle('hidden', isPitchAccentHidden));
    
    document.querySelectorAll('#result-container .segment').forEach(el => {
        el.classList.toggle('pt-[18px]', !isPitchAccentHidden);
        el.classList.toggle('pt-1', isPitchAccentHidden);
    });
}

/** Manages the theme switching functionality. */
function setupThemeSwitcher() {
  const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark');
    dom.themeCheckbox.checked = true;
  } else {
    document.documentElement.classList.remove('dark');
    dom.themeCheckbox.checked = false;
  }

  dom.themeCheckbox.addEventListener('change', () => {
    const newTheme = dom.themeCheckbox.checked ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dom.themeCheckbox.checked);
    localStorage.setItem(THEME_KEY, newTheme);
    
    // Re-render analysis if one is active, to apply new theme colors to dynamic elements
    const selectedSentenceEl = dom.readerView.querySelector<HTMLElement>('.clickable-sentence.selected');
    if (selectedSentenceEl?.dataset.sentence && state.currentTextEntryId) {
        const entry = state.findTextEntryById(state.currentTextEntryId);
        const analysis = entry?.analyzedSentences[selectedSentenceEl.dataset.sentence]?.[state.analysisDepth];
        if (analysis) {
            renderSingleAnalysis(dom.analysisView, analysis);
            applyDisplayOptions();
        }
    }
  });
}

/** Manages visibility toggles for optional visualizations. */
function setupDisplayToggles() {
    // Furigana
    const furiganaHidden = localStorage.getItem(FURIGANA_HIDDEN_KEY) === 'true';
    dom.furiganaCheckbox.checked = !furiganaHidden;
    dom.furiganaCheckbox.addEventListener('change', () => {
        const isHidden = !dom.furiganaCheckbox.checked;
        localStorage.setItem(FURIGANA_HIDDEN_KEY, String(isHidden));
        applyDisplayOptions();
    });

    // Pitch Accent
    const pitchAccentHidden = localStorage.getItem(PITCH_ACCENT_HIDDEN_KEY) !== 'false';
    dom.pitchAccentCheckbox.checked = !pitchAccentHidden;
    dom.pitchAccentCheckbox.addEventListener('change', () => {
        const isHidden = !dom.pitchAccentCheckbox.checked;
        localStorage.setItem(PITCH_ACCENT_HIDDEN_KEY, String(isHidden));
        applyDisplayOptions();
    });
}

/** Manages the analysis depth slider. */
function setupAnalysisDepthSlider() {
    const savedDepth = localStorage.getItem(ANALYSIS_DEPTH_KEY) as state.AnalysisDepth | null;
    const initialDepth = savedDepth && state.depthLevels.includes(savedDepth) ? savedDepth : 'medium';
    state.setAnalysisDepth(initialDepth);
    
    const initialIndex = state.depthLevels.indexOf(initialDepth);
    dom.analysisDepthSlider.value = String(initialIndex);
    dom.analysisDepthLabel.textContent = initialDepth.charAt(0).toUpperCase() + initialDepth.slice(1);

    dom.analysisDepthSlider.addEventListener('input', () => {
        const newDepth = state.depthLevels[parseInt(dom.analysisDepthSlider.value, 10)];
        dom.analysisDepthLabel.textContent = newDepth.charAt(0).toUpperCase() + newDepth.slice(1);
        state.setAnalysisDepth(newDepth);
        localStorage.setItem(ANALYSIS_DEPTH_KEY, newDepth);

        // If an analysis is currently displayed, re-run it with the new setting
        if (state.currentTextEntryId) {
            const entry = state.findTextEntryById(state.currentTextEntryId);
            if (!entry) return;
            
            renderReaderView(entry); // Re-render to update analyzed sentence colors

            if (!dom.readingModeView.classList.contains('hidden')) {
                startReadingMode(entry, entry.readingProgress);
                return;
            }

            const selectedSentenceEl = dom.readerView.querySelector<HTMLElement>('.clickable-sentence.selected');
            if (selectedSentenceEl?.dataset.sentence) {
                const sentence = selectedSentenceEl.dataset.sentence;
                dom.analysisView.innerHTML = `<p class="text-center p-8 text-slate-500">Analyzing with new '${newDepth}' setting...</p>`;
                performAndCacheAnalysis(entry, sentence, newDepth)
                    .then(result => {
                        renderSingleAnalysis(dom.analysisView, result);
                        applyDisplayOptions();
                    })
                    .catch(e => {
                        showError(e instanceof Error ? e.message : 'Unknown error', 'analysis');
                    });
            }
        }
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

/** Loads history from localStorage. */
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem(HISTORY_KEY);
        if (savedHistory) {
            state.setTextHistory(JSON.parse(savedHistory));
        }
    } catch (e) {
        console.error("Failed to load or parse history from localStorage", e);
        state.setTextHistory([]);
    }
    renderHistoryPanel();
}

/** Saves history to localStorage. */
function saveHistory() {
    try {
        state.textHistory.sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(state.textHistory));
    } catch (e) {
        console.error("Failed to save history to localStorage", e);
    }
}

function updateProcessButtonState() {
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

function setupApiKeyManager() {
    const storedKey = localStorage.getItem(API_KEY_KEY);
    const effectiveKey = storedKey || process.env.API_KEY || null;

    state.setApiKey(effectiveKey);

    if (storedKey) {
        dom.apiKeyInput.placeholder = 'API key saved';
        dom.apiKeyStatus.textContent = 'Using key from local storage.';
    } else if (process.env.API_KEY) {
        dom.apiKeyStatus.textContent = 'Using built-in API key.';
    } else {
        dom.apiKeyStatus.textContent = 'No API key found. Please add one.';
        dom.apiKeyStatus.classList.add('text-amber-500', 'font-semibold');
    }

    dom.saveApiKeyButton.addEventListener('click', () => {
        const newKey = dom.apiKeyInput.value.trim();
        if (newKey) {
            localStorage.setItem(API_KEY_KEY, newKey);
            state.setApiKey(newKey);
            dom.apiKeyInput.value = '';
            dom.apiKeyInput.placeholder = 'API key saved';
            dom.apiKeyStatus.textContent = '✅ Key saved and is now active.';
            dom.apiKeyStatus.classList.remove('text-amber-500', 'font-semibold');
        } else {
            localStorage.removeItem(API_KEY_KEY);
            state.setApiKey(process.env.API_KEY || null);
             dom.apiKeyStatus.textContent = 'User-defined key removed. Falling back to built-in key if available.';
        }
        updateProcessButtonState();
    });
    updateProcessButtonState();
}

/** Switches the main content area to show the editor/reader view. */
function switchToMainView() {
    dom.mainView.classList.remove('hidden');
    dom.readingModeView.classList.add('hidden');
}

/** Switches the main content area to show the focused reading mode. */
function switchToReadingMode() {
    dom.mainView.classList.add('hidden');
    dom.readingModeView.classList.remove('hidden');
}

/** Fetches analysis for a sentence if not already cached, and saves it. */
async function performAndCacheAnalysis(entry: state.TextEntry, sentence: string, depth: state.AnalysisDepth): Promise<any> {
    const cachedAnalysis = entry.analyzedSentences[sentence]?.[depth];
    if (cachedAnalysis) {
        return cachedAnalysis;
    }

    if (!state.apiKey) {
        throw new Error("API Key is not configured. Please add one in the settings menu.");
    }
    
    try {
        const result = await analyzeSentence(state.apiKey, sentence.trim(), depth);
        
        state.addAnalysisToCurrentText(sentence, result, depth);
        saveHistory();
        renderHistoryPanel();
        
        return result;
    } catch (error) {
        console.error(`Analysis failed for: "${sentence}"`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        const errorResult = { error: errorMessage };
        state.addAnalysisToCurrentText(sentence, errorResult, depth);
        saveHistory();
        throw error;
    }
}

/** Fetches analysis for the next sentence in the background. */
async function prefetchNextSentenceAnalysis(entry: state.TextEntry, currentIndex: number) {
    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！\s]+[。？！]?/g)?.filter(s => s?.trim()) || []);
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
async function startReadingMode(entry: state.TextEntry, sentenceIndex: number) {
    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！\s]+[。？！]?/g)?.filter(s => s?.trim()) || []);
    if (sentenceIndex >= sentences.length || sentences.length === 0) {
        loadTextEntry(entry.id);
        return;
    }

    const sentence = sentences[sentenceIndex];
    
    switchToReadingMode();
    renderReadingModeLoading();
    
    try {
        const analysis = await performAndCacheAnalysis(entry, sentence, state.analysisDepth);
        if (analysis.error) {
            throw new Error(analysis.error);
        }
        
        renderReadingModeView(entry, sentenceIndex, analysis);
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
        
        await prefetchNextSentenceAnalysis(entry, sentenceIndex);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
        showError(errorMessage, 'main');
    }
}

/** Loads a text entry into the main editor view. */
function loadTextEntry(id: string) {
    const entry = state.findTextEntryById(id);
    if (!entry) return;

    switchToMainView();

    dom.textTitleInput.value = entry.title;
    dom.sentenceInput.value = entry.text;
    localStorage.setItem(UNSAVED_TITLE_KEY, entry.title);
    localStorage.setItem(UNSAVED_TEXT_KEY, entry.text);
    
    state.setCurrentTextEntryId(id);

    renderReaderView(entry);
    dom.analysisView.innerHTML = `<p class="text-center p-8 text-slate-500">Select a sentence to analyze, or start reading mode.</p>`;
    updateProcessButtonState();
}

/** Clears the main view and resets state to the default new text view. */
function resetToNewTextView() {
    dom.textTitleInput.value = '';
    dom.sentenceInput.value = '';
    switchToMainView();
    dom.readerView.innerHTML = '';
    dom.analysisView.innerHTML = '';
    localStorage.removeItem(UNSAVED_TITLE_KEY);
    localStorage.removeItem(UNSAVED_TEXT_KEY);
    state.setCurrentTextEntryId(null);
    hideTooltip();
    updateProcessButtonState();
}

/** Sets up handlers for the history panel. */
function setupHistoryPanel() {
    const showPanel = () => {
        dom.historyPanel.classList.remove('translate-x-full');
        dom.historyPanelOverlay.classList.remove('invisible', 'opacity-0');
    };
    const hidePanel = () => {
        dom.historyPanel.classList.add('translate-x-full');
        dom.historyPanelOverlay.classList.add('invisible', 'opacity-0');
    };

    dom.historyButton.addEventListener('click', showPanel);
    dom.closeHistoryButton.addEventListener('click', hidePanel);
    dom.historyPanelOverlay.addEventListener('click', hidePanel);

    dom.clearHistoryButton.addEventListener('click', () => {
        if (state.textHistory.length === 0) return;
        if (window.confirm('Are you sure you want to delete all your saved texts? This cannot be undone.')) {
            state.clearAllHistory();
            saveHistory();
            renderHistoryPanel();
            if (state.currentTextEntryId) {
                resetToNewTextView();
            }
        }
    });

    dom.historyList.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const actionTarget = target.closest<HTMLElement>('[data-action]');

        if (!actionTarget) return;

        const { action, entryId } = actionTarget.dataset;
        if (!action || !entryId) return;

        const entry = state.findTextEntryById(entryId);
        if (!entry) return;

        switch (action) {
            case 'load':
                hidePanel();
                loadTextEntry(entryId);
                break;
            case 'delete':
                if (window.confirm(`Are you sure you want to delete "${entry.title}"?`)) {
                    const wasCurrentEntry = state.currentTextEntryId === entryId;
                    state.removeTextEntry(entryId);
                    saveHistory();
                    renderHistoryPanel();
                    if (wasCurrentEntry) {
                        resetToNewTextView();
                    }
                }
                break;
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

        currentAnalysisView.querySelectorAll('[data-pattern-id]').forEach(item => item.classList.remove('is-focused', 'ring-2', 'ring-sky-500', 'bg-white', 'dark:bg-slate-900'));
        currentAnalysisView.querySelectorAll('.segment').forEach(segment => segment.classList.remove('opacity-30'));
        
        if (!isAlreadyFocused) {
            noteItem.classList.add('is-focused', 'ring-2', 'ring-sky-500', 'bg-white', 'dark:bg-slate-900');
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
            showError("API Key is not configured. Please add one in the settings menu.");
            return;
        }

        const { patternName } = button.dataset;
        const examplesContainer = button.nextElementSibling;
        if (examplesContainer && examplesContainer.classList.contains('examples-container')) {
            examplesContainer.classList.toggle('hidden');
            button.textContent = examplesContainer.classList.contains('hidden') ? 'Show Examples' : 'Hide Examples';
            return;
        }

        button.disabled = true;
        button.innerHTML = '<span class="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900 dark:border-white"></span>Loading...';

        try {
            const examples = await getExampleSentences(state.apiKey, patternName!);
            
            if (examples?.length > 0) {
                const newExamplesContainer = document.createElement('div');
                newExamplesContainer.className = 'examples-container mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700';
                const list = document.createElement('dl');
                list.className = 'flex flex-col gap-4';
                examples.forEach((ex: any) => {
                    const dt = document.createElement('dt');
                    const dd = document.createElement('dd');
                    const furiganaHtml = createFuriganaHTML(ex.japanese, ex.reading, false);
                    dt.innerHTML = `<span class="text-lg font-jp">${furiganaHtml}</span>`;
                    dd.className = 'text-sm text-slate-600 dark:text-slate-400 -mt-1';
                    dd.textContent = ex.english;
                    list.append(dt, dd);
                });
                newExamplesContainer.appendChild(list);
                button.insertAdjacentElement('afterend', newExamplesContainer);
                button.textContent = 'Hide Examples';
            } else { button.textContent = 'No examples found.'; }
        } catch (error) {
            console.error(error);
            button.textContent = 'Error. Retry?';
        } finally {
            button.disabled = false;
            applyDisplayOptions();
        }
    });
}

function setupProcessButtonListener() {
    dom.button.addEventListener('click', async () => {
        const text = dom.sentenceInput.value;
        if (!text.trim()) {
            showError('Please enter some Japanese text.', 'main');
            return;
        }
        
        const title = dom.textTitleInput.value.trim() || text.substring(0, 40) + '...';
        let currentEntryId = state.currentTextEntryId;
        
        if (currentEntryId) {
            const entryToUpdate = state.findTextEntryById(currentEntryId);
            if (entryToUpdate) {
                const getSentences = (t: string): Set<string> => new Set(t.split('\n').flatMap(p => p.match(/[^。？！\s]+[。？！]?/g)?.filter(s => s?.trim()) || []));
                
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
        dom.analysisView.innerHTML = `<p class="text-center p-8 text-slate-500">Select a sentence to analyze, or start reading mode.</p>`;
    });
}

function setupMainViewListeners() {
    dom.resultContainer.addEventListener('click', async (event) => {
        if (!dom.readingModeView.classList.contains('hidden')) return;
        const target = event.target as HTMLElement;

        if (target.closest('#start-reading-button')) {
            if (state.currentTextEntryId) {
                const entry = state.findTextEntryById(state.currentTextEntryId);
                if (entry) await startReadingMode(entry, entry.readingProgress);
            }
            return;
        }

        const sentenceEl = target.closest<HTMLElement>('.clickable-sentence');
        if (sentenceEl && dom.readerView.contains(sentenceEl)) {
            const sentence = sentenceEl.dataset.sentence;
            if (!sentence || !state.currentTextEntryId) return;

            hideTooltip();
            dom.readerView.querySelectorAll('.clickable-sentence').forEach(el => el.classList.remove('selected', 'bg-sky-200/60', 'dark:bg-sky-500/30', 'font-semibold'));
            sentenceEl.classList.add('selected', 'bg-sky-200/60', 'dark:bg-sky-500/30', 'font-semibold');
            
            const currentEntry = state.findTextEntryById(state.currentTextEntryId)!;
            const analysis = currentEntry.analyzedSentences[sentence]?.[state.analysisDepth];
            
            if (analysis) {
                renderSingleAnalysis(dom.analysisView, analysis);
                setupJumpButtonAndObserver();
            } else {
                dom.analysisView.innerHTML = `<p class="text-center p-8 text-slate-500">Analyzing sentence...</p>`;
                try {
                    const result = await performAndCacheAnalysis(currentEntry, sentence, state.analysisDepth);
                    renderReaderView(currentEntry); 
                    dom.readerView.querySelector<HTMLElement>(`.clickable-sentence[data-sentence="${CSS.escape(sentence)}"]`)?.classList.add('selected', 'bg-sky-200/60', 'dark:bg-sky-500/30', 'font-semibold');
                    renderSingleAnalysis(dom.analysisView, result);
                    setupJumpButtonAndObserver();
                } catch(e) {
                    showError(e instanceof Error ? e.message : 'Unknown error', 'analysis');
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
            isTooltipPinnedFor(segment) ? hideTooltip() : pinTooltipFor(segment);
        }
    });
}

function setupReadingModeListeners() {
    dom.resultContainer.addEventListener('click', (event) => {
        if (dom.readingModeView.classList.contains('hidden')) return;
        const target = event.target as HTMLElement;
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

        const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！\s]+[。？！]?/g)?.filter(s => s?.trim()) || []);
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

function setupDataManagement() {
    dom.exportDataButton.addEventListener('click', () => {
        const backupData = {
            version: '1.0',
            exportedAt: Date.now(),
            history: state.textHistory,
            settings: {
                [THEME_KEY]: localStorage.getItem(THEME_KEY),
                [FURIGANA_HIDDEN_KEY]: localStorage.getItem(FURIGANA_HIDDEN_KEY),
                [PITCH_ACCENT_HIDDEN_KEY]: localStorage.getItem(PITCH_ACCENT_HIDDEN_KEY),
                [ANALYSIS_DEPTH_KEY]: localStorage.getItem(ANALYSIS_DEPTH_KEY)
            }
        };
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `japanese-analyzer-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    dom.importFileInput.addEventListener('change', () => {
        const file = dom.importFileInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (!data.history || !data.settings) throw new Error("Invalid backup file structure.");

                if (window.confirm("Importing will overwrite your current history and settings. Are you sure you want to continue?")) {
                    state.setTextHistory(data.history);
                    saveHistory();

                    Object.keys(data.settings).forEach(key => {
                        const value = data.settings[key];
                        if (value !== null && value !== undefined) {
                            localStorage.setItem(key, value);
                        } else {
                            localStorage.removeItem(key);
                        }
                    });
                    
                    alert("Import successful! The application will now reload to apply the new settings.");
                    window.location.reload();
                }
            } catch (err) {
                alert(`Import failed: ${err instanceof Error ? err.message : 'Could not read file.'}`);
            } finally {
                // Reset file input so the same file can be imported again
                dom.importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    });
}

function setupSettingsMenu() {
    dom.settingsButton.addEventListener('click', (event) => {
        event.stopPropagation();
        dom.settingsMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!dom.settingsMenu.classList.contains('hidden')) {
            if (!dom.settingsMenu.contains(event.target as Node) && !dom.settingsButton.contains(event.target as Node)) {
                dom.settingsMenu.classList.add('hidden');
            }
        }
    });
}

function setupNewTextButton() {
    dom.newTextButton.addEventListener('click', resetToNewTextView);
}

export function initializeApp() {
    setupApiKeyManager();
    setupSettingsMenu();
    setupHistoryPanel();
    setupThemeSwitcher();
    setupDisplayToggles();
    setupAnalysisDepthSlider();
    setupTextPersistence();
    loadHistory();
    loadSpeechSynthesisVoices();
    setupSmartTooltip();
    setupPatternFocusHandler();
    setupExampleSentenceHandler();
    setupProcessButtonListener();
    setupMainViewListeners();
    setupReadingModeListeners();
    setupNewTextButton();
    setupDataManagement();
    applyDisplayOptions();
}