// constants.ts

// LocalStorage Keys
export const HISTORY_KEY = 'japanese-analyzer-history-v2';
export const UNSAVED_TITLE_KEY = 'japanese-analyzer-unsaved-title';
export const UNSAVED_TEXT_KEY = 'japanese-analyzer-unsaved-text';
export const ANALYSIS_DEPTH_KEY = 'japanese-analyzer-analysis-depth';
export const API_KEY_KEY = 'japanese-analyzer-api-key';
export const THEME_KEY = 'theme';
export const FURIGANA_HIDDEN_KEY = 'furigana-hidden';
export const COLOR_CODING_HIDDEN_KEY = 'color-coding-hidden';
export const PITCH_ACCENT_HIDDEN_KEY = 'pitch-accent-hidden';
export const FONT_SIZE_KEY = 'japanese-analyzer-font-size';

// Settings constants
export const FONT_SIZE_STEPS = [
    { label: 'XX-Small', value: '0.75' },
    { label: 'X-Small', value: '0.85' },
    { label: 'Small', value: '1.0' },
    { label: 'Medium', value: '1.15' },
    { label: 'Large', value: '1.3' },
    { label: 'X-Large', value: '1.5' },
];
export const DEFAULT_FONT_SIZE_INDEX = 2; // Default to 'Small' (1.0)
