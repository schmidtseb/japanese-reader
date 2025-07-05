// contexts/appDataContext.tsx
import React, { createContext, useReducer, useContext, useEffect, Dispatch } from 'react';
import { AnalysisDepth } from './settingsContext.tsx';
import * as db from '../services/db.ts';

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
    isLoading: boolean;
    view: View;
    currentTextEntryId: string | null;
    editingEntryId: string | null;
    selectedSentence: string | null;
    history: TextEntry[];
    reviewDeck: ReviewItem[];
}

// --- ACTIONS ---
export type AppDataAction =
  | { type: 'INITIALIZE_DATA_SUCCESS'; payload: { history: TextEntry[], reviewDeck: ReviewItem[] } }
  | { type: 'INITIALIZE_DATA_FAILURE' }
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
    isLoading: true,
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
        case 'INITIALIZE_DATA_SUCCESS':
            return { ...state, isLoading: false, ...action.payload };
        
        case 'INITIALIZE_DATA_FAILURE':
            return { ...state, isLoading: false };
        
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

        case 'RESET_VIEW': {
            db.setTransientState('unsaved-title', '');
            db.setTransientState('unsaved-text', '');
            return {
                ...state,
                view: View.Editor,
                currentTextEntryId: null,
                selectedSentence: null,
                editingEntryId: null,
            }
        }

        case 'SET_CURRENT_TEXT_ENTRY_ID':
            return { ...state, currentTextEntryId: action.payload, selectedSentence: null };

        case 'SET_SELECTED_SENTENCE':
            return { ...state, selectedSentence: action.payload };

        case 'SET_HISTORY': {
            const newHistory = action.payload;
            db.clearTextEntries().then(() => {
                newHistory.forEach(entry => db.addOrUpdateTextEntry(entry));
            });
            return { ...state, history: newHistory };
        }
        
        case 'ADD_OR_UPDATE_TEXT_ENTRY': {
            const newEntry = action.payload;
            db.addOrUpdateTextEntry(newEntry);
            const existingIndex = state.history.findIndex(e => e.id === newEntry.id);
            let newHistory;
            if (existingIndex > -1) {
                newHistory = [...state.history];
                newHistory[existingIndex] = newEntry;
            } else {
                newHistory = [newEntry, ...state.history];
            }
            newHistory.sort((a, b) => b.updatedAt - a.updatedAt);
            return { ...state, history: newHistory, editingEntryId: null };
        }

        case 'REMOVE_TEXT_ENTRY': {
            const entryId = action.payload;
            db.deleteTextEntry(entryId);
            const newHistory = state.history.filter(e => e.id !== entryId);
            const isDeletingCurrent = state.currentTextEntryId === entryId;
            return { 
                ...state, 
                history: newHistory,
                currentTextEntryId: isDeletingCurrent ? null : state.currentTextEntryId,
                view: isDeletingCurrent ? View.Editor : state.view,
                selectedSentence: isDeletingCurrent ? null : state.selectedSentence
            };
        }
        
        case 'CLEAR_HISTORY': {
            db.clearTextEntries();
            return { ...state, history: [], currentTextEntryId: null, view: View.Editor, selectedSentence: null };
        }

        case 'SET_REVIEW_DECK': {
            const newDeck = action.payload;
             db.clearReviewDeck().then(() => {
                newDeck.forEach(item => db.addOrUpdateReviewItem(item));
            });
             return { ...state, reviewDeck: newDeck };
        }
        
        case 'ADD_OR_UPDATE_REVIEW_ITEM': {
            const newItem = action.payload;
            db.addOrUpdateReviewItem(newItem);
            const existingIndex = state.reviewDeck.findIndex(i => i.id === newItem.id);
            let newDeck;
            if (existingIndex > -1) {
                newDeck = [...state.reviewDeck];
                newDeck[existingIndex] = newItem;
            } else {
                newDeck = [...state.reviewDeck, newItem];
            }
            newDeck.sort((a, b) => a.addedAt - b.addedAt);
            return { ...state, reviewDeck: newDeck };
        }

        case 'REMOVE_REVIEW_ITEM': {
            const itemId = action.payload;
            db.deleteReviewItem(itemId);
            const newDeck = state.reviewDeck.filter(item => item.id !== itemId);
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
                db.addOrUpdateTextEntry(entryToUpdate);
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
                db.addOrUpdateTextEntry(entryToUpdate);
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
            
            db.addOrUpdateTextEntry(updatedEntry);
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
        const loadData = async () => {
            try {
                const history = await db.getAllTextEntries();
                const reviewDeck = await db.getAllReviewItems();
                dispatch({ type: 'INITIALIZE_DATA_SUCCESS', payload: { history, reviewDeck } });
            } catch (error) {
                console.error("Failed to load app data from IndexedDB", error);
                dispatch({ type: 'INITIALIZE_DATA_FAILURE' });
            }
        };

        db.initDB().then(loadData).catch(err => {
            console.error("DB Init failed", err);
            dispatch({ type: 'INITIALIZE_DATA_FAILURE' });
        });
    }, []);

    return (
        <AppDataContext.Provider value={{ state, dispatch }}>
            {children}
        </AppDataContext.Provider>
    );
};

export const useAppData = () => useContext(AppDataContext);
