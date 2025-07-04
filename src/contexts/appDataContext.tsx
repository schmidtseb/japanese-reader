// contexts/appDataContext.tsx
import React, { createContext, useReducer, useContext, useEffect, Dispatch } from 'react';
import { 
    HISTORY_KEY, 
    REVIEW_DECK_KEY, 
    UNSAVED_TEXT_KEY,
    UNSAVED_TITLE_KEY,
} from '../utils/constants.ts';
import { AnalysisDepth } from './settingsContext.tsx';

// --- TYPE DEFINITIONS ---
export interface TextEntry {
    id: string;
    title: string;
    text: string;
    createdAt: number;
    updatedAt: number;
    readingProgress: number;
    analyzedSentences: Record<string, Partial<Record<AnalysisDepth, any>>>;
}

export type ReviewQuality = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface ReviewItem {
    id: string;
    type: 'word' | 'grammar';
    content: any;
    textEntryId?: string; // Link to the source text
    srsStage: number; // 0 for new, 1-8 for stages, 9 for burned
    incorrectAnswerCount: number;
    nextReviewDate: number; // timestamp
    addedAt: number;
}

export enum View {
    Editor = 'EDITOR',
    Reader = 'READER',
    ReadingMode = 'READING_MODE',
    Review = 'REVIEW'
}

export interface AppDataState {
    view: View;
    currentTextEntryId: string | null;
    editingEntryId: string | null;
    selectedSentence: string | null;
    history: TextEntry[];
    reviewDeck: ReviewItem[];
}

// --- PERSISTENCE HELPERS ---
const saveHistory = (history: TextEntry[]) => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save history to localStorage", e);
    }
};

const saveReviewDeck = (deck: ReviewItem[]) => {
    try {
        deck.sort((a, b) => a.addedAt - b.addedAt);
        localStorage.setItem(REVIEW_DECK_KEY, JSON.stringify(deck));
    } catch (e) {
        console.error("Failed to save review deck to localStorage", e);
    }
};

// --- ACTIONS ---
export type AppDataAction =
  | { type: 'INITIALIZE_DATA'; payload: { history: TextEntry[], reviewDeck: ReviewItem[] } }
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'START_EDITING'; payload: string }
  | { type: 'SET_CURRENT_TEXT_ENTRY_ID'; payload: string | null }
  | { type: 'SET_SELECTED_SENTENCE'; payload: string | null }
  | { type: 'SET_HISTORY'; payload: TextEntry[] }
  | { type: 'ADD_OR_UPDATE_TEXT_ENTRY'; payload: TextEntry }
  | { type: 'REMOVE_TEXT_ENTRY'; payload: string }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_REVIEW_DECK'; payload: ReviewItem[] }
  | { type: 'ADD_OR_UPDATE_REVIEW_ITEM'; payload: ReviewItem }
  | { type: 'REMOVE_REVIEW_ITEM'; payload: string }
  | { type: 'RESET_VIEW' }
  | { type: 'NAVIGATE_SENTENCE'; payload: { direction: 'next' | 'prev' } }
  | { type: 'JUMP_TO_SENTENCE'; payload: { index: number } }
  | { type: 'CACHE_ANALYSIS'; payload: { entryId: string; sentence: string; depth: AnalysisDepth; analysis: any; } };


// --- INITIAL STATE ---
const initialState: AppDataState = {
    view: View.Editor,
    currentTextEntryId: null,
    editingEntryId: null,
    selectedSentence: null,
    history: [],
    reviewDeck: [],
};


// --- REDUCER ---
const appDataReducer = (state: AppDataState, action: AppDataAction): AppDataState => {
    switch (action.type) {
        case 'INITIALIZE_DATA':
            return { ...state, ...action.payload };
        
        case 'SET_VIEW':
            return { ...state, view: action.payload, selectedSentence: null };

        case 'START_EDITING':
            return {
                ...state,
                view: View.Editor,
                editingEntryId: action.payload,
                currentTextEntryId: action.payload,
                selectedSentence: null,
            };

        case 'RESET_VIEW':
            localStorage.removeItem(UNSAVED_TITLE_KEY);
            localStorage.removeItem(UNSAVED_TEXT_KEY);
            return {
                ...state,
                view: View.Editor,
                currentTextEntryId: null,
                selectedSentence: null,
                editingEntryId: null,
            }

        case 'SET_CURRENT_TEXT_ENTRY_ID':
            return { ...state, currentTextEntryId: action.payload, selectedSentence: null };

        case 'SET_SELECTED_SENTENCE':
            return { ...state, selectedSentence: action.payload };

        case 'SET_HISTORY':
             saveHistory(action.payload);
             return { ...state, history: action.payload };
        
        case 'ADD_OR_UPDATE_TEXT_ENTRY': {
            const newEntry = action.payload;
            const existingIndex = state.history.findIndex(e => e.id === newEntry.id);
            let newHistory;
            if (existingIndex > -1) {
                newHistory = [...state.history];
                newHistory[existingIndex] = newEntry;
            } else {
                newHistory = [newEntry, ...state.history];
            }
            newHistory.sort((a, b) => b.updatedAt - a.updatedAt);
            saveHistory(newHistory);
            return { ...state, history: newHistory, editingEntryId: null };
        }

        case 'REMOVE_TEXT_ENTRY': {
            const newHistory = state.history.filter(e => e.id !== action.payload);
            saveHistory(newHistory);
            const isDeletingCurrent = state.currentTextEntryId === action.payload;
            return { 
                ...state, 
                history: newHistory,
                currentTextEntryId: isDeletingCurrent ? null : state.currentTextEntryId,
                view: isDeletingCurrent ? View.Editor : state.view,
                selectedSentence: isDeletingCurrent ? null : state.selectedSentence
            };
        }
        
        case 'CLEAR_HISTORY': {
            saveHistory([]);
            return { ...state, history: [], currentTextEntryId: null, view: View.Editor, selectedSentence: null };
        }

        case 'SET_REVIEW_DECK':
             saveReviewDeck(action.payload);
             return { ...state, reviewDeck: action.payload };
        
        case 'ADD_OR_UPDATE_REVIEW_ITEM': {
            const newItem = action.payload;
            const existingIndex = state.reviewDeck.findIndex(i => i.id === newItem.id);
            let newDeck;
            if (existingIndex > -1) {
                newDeck = [...state.reviewDeck];
                newDeck[existingIndex] = newItem;
            } else {
                newDeck = [...state.reviewDeck, newItem];
            }
            saveReviewDeck(newDeck);
            return { ...state, reviewDeck: newDeck };
        }

        case 'REMOVE_REVIEW_ITEM': {
            const newDeck = state.reviewDeck.filter(item => item.id !== action.payload);
            saveReviewDeck(newDeck);
            return { ...state, reviewDeck: newDeck };
        }
        
        case 'NAVIGATE_SENTENCE': {
            if (!state.currentTextEntryId) return state;
            const entryIndex = state.history.findIndex(e => e.id === state.currentTextEntryId);
            if (entryIndex === -1) return state;

            const historyCopy = [...state.history];
            const entryToUpdate = { ...historyCopy[entryIndex] };
            
            const sentences = entryToUpdate.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
            
            const currentProgress = entryToUpdate.readingProgress;
            const newProgress = currentProgress + (action.payload.direction === 'next' ? 1 : -1);

            if (newProgress >= 0 && newProgress < sentences.length) {
                entryToUpdate.readingProgress = newProgress;
                historyCopy[entryIndex] = entryToUpdate;
                saveHistory(historyCopy);
                return { ...state, history: historyCopy };
            }
            
            return state;
        }

        case 'JUMP_TO_SENTENCE': {
            if (!state.currentTextEntryId) return state;
            const entryIndex = state.history.findIndex(e => e.id === state.currentTextEntryId);
            if (entryIndex === -1) return state;

            const historyCopy = [...state.history];
            const entryToUpdate = { ...historyCopy[entryIndex] };
            const sentences = entryToUpdate.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
            const newProgress = action.payload.index;

            if (newProgress >= 0 && newProgress < sentences.length) {
                entryToUpdate.readingProgress = newProgress;
                historyCopy[entryIndex] = entryToUpdate;
                saveHistory(historyCopy);
                return { ...state, history: historyCopy };
            }

            return state;
        }

        case 'CACHE_ANALYSIS': {
            const { entryId, sentence, depth, analysis } = action.payload;
            const entryIndex = state.history.findIndex(e => e.id === entryId);
            if (entryIndex === -1) return state;

            const historyCopy = [...state.history];
            const oldEntry = historyCopy[entryIndex];

            const newSentenceAnalyses = {
                ...(oldEntry.analyzedSentences[sentence] || {}),
                [depth]: analysis,
            };

            const newAnalyzedSentences = {
                ...oldEntry.analyzedSentences,
                [sentence]: newSentenceAnalyses,
            };
            
            const updatedEntry = { ...oldEntry, analyzedSentences: newAnalyzedSentences };
            historyCopy[entryIndex] = updatedEntry;
            
            saveHistory(historyCopy);
            return { ...state, history: historyCopy };
        }

        default:
            return state;
    }
};

// --- CONTEXT & PROVIDER ---
const AppDataContext = createContext<{ state: AppDataState; dispatch: Dispatch<AppDataAction> }>({
    state: initialState,
    dispatch: () => null
});

export function AppDataProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(appDataReducer, initialState);

    useEffect(() => {
        try {
            const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            let reviewDeckData = JSON.parse(localStorage.getItem(REVIEW_DECK_KEY) || '[]');

            // Migration logic: check for old format and convert by resetting SRS progress
            const migratedDeck = reviewDeckData.map((item: any) => {
                // If item has 'easeFactor' or doesn't have 'srsStage', it's the old format.
                if (item.hasOwnProperty('easeFactor') || !item.hasOwnProperty('srsStage')) {
                    console.log(`Migrating item ${item.id} to new SRS format.`);
                    const { id, type, content, textEntryId, addedAt } = item;
                    // Reset progress for the new system
                    return {
                        id,
                        type,
                        content,
                        textEntryId,
                        addedAt,
                        srsStage: 0,
                        incorrectAnswerCount: 0,
                        nextReviewDate: new Date().setHours(0, 0, 0, 0),
                    };
                }
                return item;
            });

            dispatch({ type: 'INITIALIZE_DATA', payload: { history, reviewDeck: migratedDeck } });
        } catch (error) {
            console.error("Failed to load app data from localStorage", error);
        }
    }, []);

    return (
        <AppDataContext.Provider value={{ state, dispatch }}>
            {children}
        </AppDataContext.Provider>
    );
};

export const useAppData = () => useContext(AppDataContext);