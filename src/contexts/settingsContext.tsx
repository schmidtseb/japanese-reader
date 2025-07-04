// contexts/settingsContext.tsx
import React, { createContext, useReducer, useContext, useEffect, Dispatch } from 'react';
import { 
    THEME_KEY, 
    FURIGANA_HIDDEN_KEY, 
    COLOR_CODING_HIDDEN_KEY, 
    PITCH_ACCENT_HIDDEN_KEY, 
    ANALYSIS_DEPTH_KEY, 
    FONT_SIZE_KEY,
    NEW_WORDS_PER_DAY_KEY,
    USER_API_KEY,
    FONT_SIZE_STEPS,
    DEFAULT_FONT_SIZE_INDEX
} from '../utils/constants.ts';

// --- TYPE DEFINITIONS ---
export type AnalysisDepth = 'low' | 'medium' | 'high';
export const depthLevels: AnalysisDepth[] = ['low', 'medium', 'high'];

export interface Settings {
    theme: 'light' | 'dark';
    showFurigana: boolean;
    showColorCoding: boolean;
    showPitchAccent: boolean;
    analysisDepth: AnalysisDepth;
    fontSizeIndex: number;
    newWordsPerDay: number;
    userApiKey: string | null;
}

// --- ACTIONS ---
type Action =
  | { type: 'INITIALIZE_SETTINGS'; payload: Settings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> };

// --- INITIAL STATE ---
const initialState: Settings = {
    theme: 'light',
    showFurigana: true,
    showColorCoding: true,
    showPitchAccent: true,
    analysisDepth: 'medium',
    fontSizeIndex: DEFAULT_FONT_SIZE_INDEX,
    newWordsPerDay: 10,
    userApiKey: null,
};

// --- REDUCER ---
const settingsReducer = (state: Settings, action: Action): Settings => {
    switch (action.type) {
        case 'INITIALIZE_SETTINGS':
            return action.payload;
        
        case 'UPDATE_SETTINGS': {
            const newSettings = { ...state, ...action.payload };
            // Persist settings to localStorage
            localStorage.setItem(THEME_KEY, newSettings.theme);
            localStorage.setItem(FURIGANA_HIDDEN_KEY, String(!newSettings.showFurigana));
            localStorage.setItem(COLOR_CODING_HIDDEN_KEY, String(!newSettings.showColorCoding));
            localStorage.setItem(PITCH_ACCENT_HIDDEN_KEY, String(!newSettings.showPitchAccent));
            localStorage.setItem(ANALYSIS_DEPTH_KEY, newSettings.analysisDepth);
            localStorage.setItem(FONT_SIZE_KEY, String(newSettings.fontSizeIndex));
            localStorage.setItem(NEW_WORDS_PER_DAY_KEY, String(newSettings.newWordsPerDay));
            
            // Handle API key persistence and state normalization
            if (typeof newSettings.userApiKey === 'string' && newSettings.userApiKey.trim().length > 0) {
                const trimmedKey = newSettings.userApiKey.trim();
                localStorage.setItem(USER_API_KEY, trimmedKey);
                newSettings.userApiKey = trimmedKey;
            } else {
                localStorage.removeItem(USER_API_KEY);
                newSettings.userApiKey = null;
            }
            
            // Apply theme immediately
            document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
            document.documentElement.style.setProperty('--font-size-multiplier', FONT_SIZE_STEPS[newSettings.fontSizeIndex].value);

            return newSettings;
        }
        default:
            return state;
    }
};

// --- CONTEXT & PROVIDER ---
const SettingsContext = createContext<{ state: Settings; dispatch: Dispatch<Action> }>({
    state: initialState,
    dispatch: () => null
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(settingsReducer, initialState);

    useEffect(() => {
        try {
            const settings: Settings = {
                theme: (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light',
                showFurigana: localStorage.getItem(FURIGANA_HIDDEN_KEY) !== 'true',
                showColorCoding: localStorage.getItem(COLOR_CODING_HIDDEN_KEY) !== 'true',
                showPitchAccent: localStorage.getItem(PITCH_ACCENT_HIDDEN_KEY) !== 'true',
                analysisDepth: (localStorage.getItem(ANALYSIS_DEPTH_KEY) as AnalysisDepth) || 'medium',
                fontSizeIndex: parseInt(localStorage.getItem(FONT_SIZE_KEY) || String(DEFAULT_FONT_SIZE_INDEX), 10),
                newWordsPerDay: parseInt(localStorage.getItem(NEW_WORDS_PER_DAY_KEY) || '10', 10),
                userApiKey: localStorage.getItem(USER_API_KEY) || null,
            };

            // Apply theme and font size on load
            document.documentElement.classList.toggle('dark', settings.theme === 'dark');
            document.documentElement.style.setProperty('--font-size-multiplier', FONT_SIZE_STEPS[settings.fontSizeIndex].value);

            dispatch({ type: 'INITIALIZE_SETTINGS', payload: settings });
        } catch (error) {
            console.error("Failed to load settings from localStorage", error);
        }
    }, []);

    return (
        <SettingsContext.Provider value={{ state, dispatch }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);