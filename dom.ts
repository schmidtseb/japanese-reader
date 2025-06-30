
// dom.ts

export const button = document.getElementById('generate-button') as HTMLButtonElement;
export const sentenceInput = document.getElementById('sentence-input') as HTMLTextAreaElement;
export const textTitleInput = document.getElementById('text-title-input') as HTMLInputElement;
export const resultContainer = document.getElementById('result-container') as HTMLDivElement;
export const inputArea = document.querySelector('.input-area') as HTMLDivElement;
export const mainView = document.getElementById('main-view') as HTMLDivElement;
export const readerView = document.getElementById('reader-view') as HTMLDivElement;
export const analysisView = document.getElementById('analysis-view') as HTMLDivElement;
export const readingModeView = document.getElementById('reading-mode-view') as HTMLDivElement;
export const themeCheckbox = document.getElementById('theme-checkbox') as HTMLInputElement;
export const furiganaCheckbox = document.getElementById('furigana-checkbox') as HTMLInputElement;
export const colorCodingCheckbox = document.getElementById('color-coding-checkbox') as HTMLInputElement;
export const pitchAccentCheckbox = document.getElementById('pitch-accent-checkbox') as HTMLInputElement;
export const tooltip = document.getElementById('tooltip') as HTMLDivElement;
export const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
export const settingsMenu = document.getElementById('settings-menu') as HTMLDivElement;
export const analysisDepthSlider = document.getElementById('analysis-depth-slider') as HTMLInputElement;
export const analysisDepthLabel = document.getElementById('analysis-depth-label') as HTMLSpanElement;
export const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement;
export const fontSizeLabel = document.getElementById('font-size-label') as HTMLSpanElement;
export const appHeader = document.getElementById('app-header') as HTMLElement;

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

// Modal elements
export const modalOverlay = document.getElementById('modal-overlay') as HTMLDivElement;
export const modalBox = document.getElementById('modal-box') as HTMLDivElement;
export const modalMessage = document.getElementById('modal-message') as HTMLParagraphElement;
export const modalConfirmButton = document.getElementById('modal-confirm-button') as HTMLButtonElement;
export const modalCancelButton = document.getElementById('modal-cancel-button') as HTMLButtonElement;

// Bottom sheet elements
export const bottomSheet = document.getElementById('bottom-sheet') as HTMLDivElement;
export const bottomSheetTitle = document.getElementById('bottom-sheet-title') as HTMLHeadingElement;
export const bottomSheetContent = document.getElementById('bottom-sheet-content') as HTMLDivElement;
export const bottomSheetCloseButton = document.getElementById('bottom-sheet-close-button') as HTMLButtonElement;


if (!button || !sentenceInput || !textTitleInput || !resultContainer || !inputArea || !mainView || !readerView || !analysisView || !readingModeView || !themeCheckbox || !furiganaCheckbox || !colorCodingCheckbox || !pitchAccentCheckbox || !tooltip || !settingsButton || !settingsMenu || !newTextButton || !historyButton || !historyPanel || !closeHistoryButton || !clearHistoryButton || !historyList || !historyEmptyMessage || !historyPanelOverlay || !analysisDepthSlider || !analysisDepthLabel || !fontSizeSlider || !fontSizeLabel || !exportDataButton || !importDataButton || !importFileInput || !apiKeyInput || !saveApiKeyButton || !apiKeyStatus || !modalOverlay || !modalBox || !modalMessage || !modalConfirmButton || !modalCancelButton || !appHeader || !bottomSheet || !bottomSheetTitle || !bottomSheetContent || !bottomSheetCloseButton) {
  throw new Error('Required HTML elements not found at startup.');
}