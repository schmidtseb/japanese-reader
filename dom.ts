
// dom.ts

export const button = document.getElementById('generate-button') as HTMLButtonElement;
export const sentenceInput = document.getElementById('sentence-input') as HTMLTextAreaElement;
export const textTitleInput = document.getElementById('text-title-input') as HTMLInputElement;
export const resultContainer = document.getElementById('result-container') as HTMLDivElement;
export const mainView = document.getElementById('main-view') as HTMLDivElement;
export const readerView = document.getElementById('reader-view') as HTMLDivElement;
export const analysisView = document.getElementById('analysis-view') as HTMLDivElement;
export const readingModeView = document.getElementById('reading-mode-view') as HTMLDivElement;
export const themeCheckbox = document.getElementById('theme-checkbox') as HTMLInputElement;
export const furiganaCheckbox = document.getElementById('furigana-checkbox') as HTMLInputElement;
export const pitchAccentCheckbox = document.getElementById('pitch-accent-checkbox') as HTMLInputElement;
export const tooltip = document.getElementById('tooltip') as HTMLDivElement;
export const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
export const settingsMenu = document.getElementById('settings-menu') as HTMLDivElement;
export const analysisDepthSlider = document.getElementById('analysis-depth-slider') as HTMLInputElement;
export const analysisDepthLabel = document.getElementById('analysis-depth-label') as HTMLSpanElement;

// Header buttons
export const newTextButton = document.getElementById('new-text-button') as HTMLButtonElement;
export const historyButton = document.getElementById('history-button') as HTMLButtonElement;

// History panel elements
export const historyPanel = document.getElementById('history-panel') as HTMLDivElement;
export const historyPanelOverlay = document.getElementById('history-panel-overlay') as HTMLDivElement;
export const closeHistoryButton = document.getElementById('close-history-button') as HTMLButtonElement;
export const clearHistoryButton = document.getElementById('clear-history-button') as HTMLButtonElement;
export const historyList = document.getElementById('history-list') as HTMLUListElement;
export const historyEmptyMessage = document.getElementById('history-empty-message') as HTMLParagraphElement;

// Settings menu extras
export const exportDataButton = document.getElementById('export-data-button') as HTMLButtonElement;
export const importDataButton = document.getElementById('import-data-button') as HTMLLabelElement;
export const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;
export const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
export const saveApiKeyButton = document.getElementById('save-api-key-button') as HTMLButtonElement;
export const apiKeyStatus = document.getElementById('api-key-status') as HTMLParagraphElement;

if (!button || !sentenceInput || !textTitleInput || !resultContainer || !mainView || !readerView || !analysisView || !readingModeView || !themeCheckbox || !furiganaCheckbox || !pitchAccentCheckbox || !tooltip || !settingsButton || !settingsMenu || !newTextButton || !historyButton || !historyPanel || !closeHistoryButton || !clearHistoryButton || !historyList || !historyEmptyMessage || !historyPanelOverlay || !analysisDepthSlider || !analysisDepthLabel || !exportDataButton || !importDataButton || !importFileInput || !apiKeyInput || !saveApiKeyButton || !apiKeyStatus) {
  throw new Error('Required HTML elements not found at startup.');
}
