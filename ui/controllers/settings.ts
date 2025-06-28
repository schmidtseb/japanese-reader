
// ui/controllers/settings.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';
import { renderSingleAnalysis } from '../render/analysis.ts';
import { renderReaderView } from '../render/reader.ts';
import { showAlertModal, showConfirmationModal } from '../modal.ts';
import { applyDisplayOptions, formatApiError, updateProcessButtonState } from '../view.ts';
import { performAndCacheAnalysis, startReadingMode } from '../actions.ts';
import { showError } from '../render/common.ts';
import {
    API_KEY_KEY,
    THEME_KEY,
    FURIGANA_HIDDEN_KEY,
    PITCH_ACCENT_HIDDEN_KEY,
    ANALYSIS_DEPTH_KEY,
    FONT_SIZE_KEY,
} from '../handlers.ts';
import { saveHistory } from './history.ts';


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
    const sizeSteps = [
        { label: 'Small', value: '0.85' },
        { label: 'Normal', value: '1.0' },
        { label: 'Medium', value: '1.15' },
        { label: 'Large', value: '1.3' },
        { label: 'X-Large', value: '1.5' },
    ];
    
    const savedSizeIndexStr = localStorage.getItem(FONT_SIZE_KEY);
    // Default to 'Normal' (index 1) if nothing is saved
    const savedSizeIndex = savedSizeIndexStr ? parseInt(savedSizeIndexStr, 10) : 1;
    const initialIndex = (savedSizeIndex >= 0 && savedSizeIndex < sizeSteps.length) ? savedSizeIndex : 1;

    function applyFontSize(index: number) {
        if (index < 0 || index >= sizeSteps.length) return;
        const step = sizeSteps[index];
        document.documentElement.style.setProperty('--font-size-multiplier', step.value);
        dom.fontSizeSlider.value = String(index);
        dom.fontSizeLabel.textContent = step.label;
        localStorage.setItem(FONT_SIZE_KEY, String(index));
    }

    applyFontSize(initialIndex);

    dom.fontSizeSlider.addEventListener('input', () => {
        const newIndex = parseInt(dom.fontSizeSlider.value, 10);
        applyFontSize(newIndex);
    });
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

                showConfirmationModal(
                    "Importing will overwrite your current history and settings. Are you sure you want to continue?",
                    () => {
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
                        
                        showAlertModal("Import successful! The application will now reload to apply the new settings.", () => {
                            window.location.reload();
                        });
                    },
                    { confirmText: "Import", confirmClass: "bg-sky-600 hover:bg-sky-700" }
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
    setupApiKeyManager();
    setupSettingsMenu();
    setupThemeSwitcher();
    setupDisplayToggles();
    setupAnalysisDepthSlider();
    setupFontSizeSlider();
    setupDataManagement();
}