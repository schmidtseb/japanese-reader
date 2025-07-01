// ui/controllers/settings.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';
import { renderSingleAnalysis } from '../render/analysis.ts';
import { renderReaderView } from '../render/reader.ts';
import { renderHistoryPanel } from '../render/history.ts';
import { showAlertModal, showConfirmationModal } from '../modal.ts';
import { applyDisplayOptions, formatApiError, updateProcessButtonState, resetToNewTextView } from '../view.ts';
import { performAndCacheAnalysis, startReadingMode } from '../actions.ts';
import { showError } from '../render/common.ts';
import {
    API_KEY_KEY,
    THEME_KEY,
    FURIGANA_HIDDEN_KEY,
    COLOR_CODING_HIDDEN_KEY,
    PITCH_ACCENT_HIDDEN_KEY,
    ANALYSIS_DEPTH_KEY,
    FONT_SIZE_KEY,
    FONT_SIZE_STEPS,
    DEFAULT_FONT_SIZE_INDEX
} from '../../constants.ts';
import { saveHistory } from './history.ts';


/**
 * Reads all settings from localStorage and applies them to the DOM and state.
 * This function does not set up event listeners.
 */
function applyAllSettings() {
    // Theme
    const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    dom.themeCheckbox.checked = (currentTheme === 'dark');
    
    // Display Toggles
    const furiganaHidden = localStorage.getItem(FURIGANA_HIDDEN_KEY) === 'true';
    dom.furiganaCheckbox.checked = !furiganaHidden;

    const colorCodingHidden = localStorage.getItem(COLOR_CODING_HIDDEN_KEY) !== 'false'; // Default to true (on)
    dom.colorCodingCheckbox.checked = !colorCodingHidden;

    const pitchAccentHidden = localStorage.getItem(PITCH_ACCENT_HIDDEN_KEY) !== 'false';
    dom.pitchAccentCheckbox.checked = !pitchAccentHidden;
    applyDisplayOptions();
    
    // Analysis Depth
    const savedDepth = localStorage.getItem(ANALYSIS_DEPTH_KEY) as state.AnalysisDepth | null;
    const newDepth = savedDepth && state.depthLevels.includes(savedDepth) ? savedDepth : 'medium';
    state.setAnalysisDepth(newDepth);
    const newIndex = state.depthLevels.indexOf(newDepth);
    dom.analysisDepthSlider.value = String(newIndex);
    dom.analysisDepthLabel.textContent = newDepth.charAt(0).toUpperCase() + newDepth.slice(1);
    
    // Font Size
    const sizeSteps = FONT_SIZE_STEPS;
    const savedSizeIndexStr = localStorage.getItem(FONT_SIZE_KEY);
    const savedSizeIndex = savedSizeIndexStr ? parseInt(savedSizeIndexStr, 10) : DEFAULT_FONT_SIZE_INDEX;
    const sizeIndex = (savedSizeIndex >= 0 && savedSizeIndex < sizeSteps.length) ? savedSizeIndex : DEFAULT_FONT_SIZE_INDEX;
    if (sizeIndex >= 0 && sizeIndex < sizeSteps.length) {
        const step = sizeSteps[sizeIndex];
        document.documentElement.style.setProperty('--font-size-multiplier', step.value);
        dom.fontSizeSlider.value = String(sizeIndex);
        dom.fontSizeLabel.textContent = step.label;
    }

    // API Key
    const storedKey = localStorage.getItem(API_KEY_KEY);
    const effectiveKey = storedKey || process.env.API_KEY || null;
    state.setApiKey(effectiveKey);
    dom.apiKeyInput.value = ''; // Clear the input field
    if (storedKey) {
        dom.apiKeyInput.placeholder = 'API key saved';
        dom.apiKeyStatus.textContent = 'Using key from local storage.';
        dom.apiKeyStatus.classList.remove('text-warning-text', 'font-semibold');
    } else if (process.env.API_KEY) {
        dom.apiKeyStatus.textContent = 'Using built-in API key.';
        dom.apiKeyStatus.classList.remove('text-warning-text', 'font-semibold');
    } else {
        dom.apiKeyStatus.textContent = 'No API key found. Please add one.';
        dom.apiKeyStatus.classList.add('text-warning-text', 'font-semibold');
    }
    updateProcessButtonState();
}


/** Manages the theme switching functionality. */
function setupThemeSwitcher() {
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
    dom.furiganaCheckbox.addEventListener('change', () => {
        const isHidden = !dom.furiganaCheckbox.checked;
        localStorage.setItem(FURIGANA_HIDDEN_KEY, String(isHidden));
        applyDisplayOptions();
    });

    dom.colorCodingCheckbox.addEventListener('change', () => {
        const isHidden = !dom.colorCodingCheckbox.checked;
        localStorage.setItem(COLOR_CODING_HIDDEN_KEY, String(isHidden));
        applyDisplayOptions();
    });

    dom.pitchAccentCheckbox.addEventListener('change', () => {
        const isHidden = !dom.pitchAccentCheckbox.checked;
        localStorage.setItem(PITCH_ACCENT_HIDDEN_KEY, String(isHidden));
        applyDisplayOptions();
    });
}

/** Manages the analysis depth slider. */
function setupAnalysisDepthSlider() {
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
                dom.analysisView.innerHTML = `<p class="text-center p-8 text-text-muted">Analyzing with new '${newDepth}' setting...</p>`;
                performAndCacheAnalysis(entry, sentence, newDepth)
                    .then(result => {
                        renderSingleAnalysis(dom.analysisView, result);
                        applyDisplayOptions();
                    })
                    .catch(e => {
                        const error = e instanceof Error ? e : new Error(String(e));
                        const { main, detail } = formatApiError(error);
                        showError(main, 'analysis', detail);
                    });
            }
        }
    });
}

/** Manages the font size slider. */
function setupFontSizeSlider() {
    const sizeSteps = FONT_SIZE_STEPS;
    
    dom.fontSizeSlider.addEventListener('input', () => {
        const newIndex = parseInt(dom.fontSizeSlider.value, 10);
        if (newIndex >= 0 && newIndex < sizeSteps.length) {
            const step = sizeSteps[newIndex];
            document.documentElement.style.setProperty('--font-size-multiplier', step.value);
            dom.fontSizeLabel.textContent = step.label;
            localStorage.setItem(FONT_SIZE_KEY, String(newIndex));
        }
    });
}

function setupApiKeyManager() {
    dom.saveApiKeyButton.addEventListener('click', () => {
        const newKey = dom.apiKeyInput.value.trim();
        if (newKey) {
            localStorage.setItem(API_KEY_KEY, newKey);
            state.setApiKey(newKey);
            dom.apiKeyInput.value = '';
            dom.apiKeyInput.placeholder = 'API key saved';
            dom.apiKeyStatus.textContent = '✅ Key saved and is now active.';
            dom.apiKeyStatus.classList.remove('text-warning-text', 'font-semibold');
        } else {
            localStorage.removeItem(API_KEY_KEY);
            state.setApiKey(process.env.API_KEY || null);
             dom.apiKeyStatus.textContent = 'User-defined key removed. Falling back to built-in key if available.';
        }
        updateProcessButtonState();
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
                [COLOR_CODING_HIDDEN_KEY]: localStorage.getItem(COLOR_CODING_HIDDEN_KEY),
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

                showConfirmationModal(
                    "Importing will overwrite your current history and settings. Are you sure you want to continue?",
                    () => {
                        // 1. Update localStorage with new settings from imported data.
                        Object.keys(data.settings).forEach(key => {
                            const value = data.settings[key];
                            if (value !== null && value !== undefined) {
                                localStorage.setItem(key, value);
                            } else {
                                localStorage.removeItem(key);
                            }
                        });

                        // 2. Update history state and persist.
                        state.setTextHistory(data.history);
                        saveHistory();

                        // 3. Apply all new settings to the current view.
                        applyAllSettings();
                        
                        // 4. Update UI components.
                        renderHistoryPanel();
                        resetToNewTextView();
                        
                        // 5. Inform user.
                        showAlertModal("Import successful! Your data and settings have been updated.");
                    },
                    { confirmText: "Import", confirmClass: "bg-accent hover:bg-accent/90" }
                );
            } catch (err) {
                showAlertModal(`Import failed: ${err instanceof Error ? err.message : 'Could not read file.'}`);
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

export function initializeSettings() {
    applyAllSettings();
    setupSettingsMenu();
    setupThemeSwitcher();
    setupDisplayToggles();
    setupAnalysisDepthSlider();
    setupFontSizeSlider();
    setupApiKeyManager();
    setupDataManagement();
}
