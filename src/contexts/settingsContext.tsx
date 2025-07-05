// contexts/settingsContext.tsx
import React, { createContext, useReducer, useContext, useEffect, Dispatch } from 'react';
import { FONT_SIZE_STEPS, DEFAULT_FONT_SIZE_INDEX } from '../utils/constants.ts';
import * as db from '../services/db.ts';

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

export interface SettingsState extends Settings {
    isLoading: boolean;
}

// --- ACTIONS ---
type Action =
  | { type: 'INITIALIZE_SETTINGS_SUCCESS'; payload: Settings }
  | { type: 'INITIALIZE_SETTINGS_FAILURE' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> };

// --- INITIAL STATE ---
const initialState: SettingsState = {
    isLoading: true,
    theme: 'light',
    showFurigana: true,
    showColorCoding: true,
    showPitchAccent: true,
    analysisDepth: 'medium',
    fontSizeIndex: DEFAULT_FONT_SIZE_INDEX,
    newWordsPerDay: 10,
    userApiKey: null,
};

const applySettingsToDOM = (settings: Settings) => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document.documentElement.style.setProperty('--font-size-multiplier', FONT_SIZE_STEPS[settings.fontSizeIndex].value);
};

// --- REDUCER ---
const settingsReducer = (state: SettingsState, action: Action): SettingsState => {
    switch (action.type) {
        case 'INITIALIZE_SETTINGS_SUCCESS':
            applySettingsToDOM(action.payload);
            return { ...state, isLoading: false, ...action.payload };
        
        case 'INITIALIZE_SETTINGS_FAILURE':
            return { ...state, isLoading: false };
        
        case 'UPDATE_SETTINGS': {
            const newSettings = { ...state, ...action.payload };
            
            const settingsToSave: Partial<Settings> = { ...action.payload };
            // Normalize API key before saving
            if (typeof settingsToSave.userApiKey === 'string' && settingsToSave.userApiKey.trim().length > 0) {
                settingsToSave.userApiKey = settingsToSave.userApiKey.trim();
            } else {
                settingsToSave.userApiKey = null;
            }

            db.saveSettings(settingsToSave);
            applySettingsToDOM(newSettings);

            return newSettings;
        }
        default:
            return state;
    }
};

// --- CONTEXT & PROVIDER ---
const SettingsContext = createContext<{ state: SettingsState; dispatch: Dispatch<Action> }>({
    state: initialState,
    dispatch: () => null
});

interface SettingsProviderProps {
    children: React.ReactNode;
    _testState?: SettingsState;
}

export function SettingsProvider({ children, _testState }: SettingsProviderProps) {
    const [state, dispatch] = useReducer(settingsReducer, _testState || initialState);

    useEffect(() => {
        if (_testState) {
            return;
        }

        const loadSettings = async () => {
            try {
                const settings = await db.getAllSettings();
                dispatch({ type: 'INITIALIZE_SETTINGS_SUCCESS', payload: settings });
            } catch (error) {
                console.error("Failed to load settings from IndexedDB", error);
                dispatch({ type: 'INITIALIZE_SETTINGS_FAILURE' });
            }
        };

        db.initDB().then(loadSettings).catch(err => {
            console.error("DB Init failed", err);
            dispatch({ type: 'INITIALIZE_SETTINGS_FAILURE' });
        });
    }, [_testState]);

    return (
        <SettingsContext.Provider value={{ state, dispatch }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);