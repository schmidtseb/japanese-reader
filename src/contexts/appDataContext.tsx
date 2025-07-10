// contexts/appDataContext.tsx
import React, { createContext, useReducer, useContext, useEffect, Dispatch, useCallback } from 'react';
import { AnalysisDepth } from './settingsContext.tsx';
import * as db from '../services/db.ts';
import { useAuth } from './authContext.tsx';

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
    intervalModifier: number; // Modifies base interval, starts at 1.0, adjusts based on performance
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
    urlToImport: string | null;
}

// --- ACTIONS ---
export type AppDataAction =
  | { type: 'INITIALIZE_DATA_SUCCESS'; payload: { history: TextEntry[], reviewDeck: ReviewItem[], currentTextEntryId: string | null, view: View } }
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
  | { type: 'CACHE_ANALYSIS'; payload: { entryId: string; sentence: string; depth: AnalysisDepth; analysis: any; } }
  | { type: 'SET_URL_TO_IMPORT'; payload: string }
  | { type: 'CLEAR_URL_TO_IMPORT' };


// --- INITIAL STATE ---
const initialState: AppDataState = {
    isLoading: true,
    view: View.Editor,
    currentTextEntryId: null,
    editingEntryId: null,
    selectedSentence: null,
    history: [],
    reviewDeck: [],
    urlToImport: null,
};


// --- REDUCER ---
export const appDataReducer = (state: AppDataState, action: AppDataAction): AppDataState => {
    switch (action.type) {
        case 'INITIALIZE_DATA_SUCCESS':
            return { 
                ...state, 
                isLoading: false, 
                history: action.payload.history,
                reviewDeck: action.payload.reviewDeck,
                currentTextEntryId: action.payload.currentTextEntryId,
                view: action.payload.view,
            };
        
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
            db.setTransientState('session_currentTextEntryId', null);
            return {
                ...state,
                view: View.Editor,
                currentTextEntryId: null,
                selectedSentence: null,
                editingEntryId: null,
            }
        }

        case 'SET_CURRENT_TEXT_ENTRY_ID':
            db.setTransientState('session_currentTextEntryId', action.payload);
            // When a text is loaded, clear any stale "unsaved" text from the editor.
            db.setTransientState('unsaved-title', '');
            db.setTransientState('unsaved-text', '');
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
            // When a text is saved, clear the transient "unsaved" version.
            db.setTransientState('unsaved-title', '');
            db.setTransientState('unsaved-text', '');
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
            // If deleting the currently viewed text, clear it from the session.
            if (isDeletingCurrent) {
                db.setTransientState('session_currentTextEntryId', null);
            }
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
            db.setTransientState('session_currentTextEntryId', null);
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
            
            const updatedEntry = { ...oldEntry, analyzedSentences: newAnalyzedSentences, updatedAt: Date.now() };
            historyCopy[entryIndex] = updatedEntry;
            
            db.addOrUpdateTextEntry(updatedEntry);
            return { ...state, history: historyCopy };
        }
        
        case 'SET_URL_TO_IMPORT':
            return { ...state, view: View.Editor, urlToImport: action.payload };

        case 'CLEAR_URL_TO_IMPORT':
            return { ...state, urlToImport: null };

        default:
            return state;
    }
};

// --- CONTEXT & PROVIDER ---
const AppDataContext = createContext<{ state: AppDataState; dispatch: Dispatch<AppDataAction> }>({
    state: initialState,
    dispatch: () => null
});

interface AppDataProviderProps {
    children?: React.ReactNode;
    _testDispatch?: Dispatch<AppDataAction>;
    _testState?: AppDataState;
}

export function AppDataProvider({ children, _testDispatch, _testState }: AppDataProviderProps) {
    const [state, dispatch] = useReducer(appDataReducer, _testState || initialState);
    const { user, supabase } = useAuth();

    const syncedDispatch = useCallback(async (action: AppDataAction) => {
        // Run local reducer first for optimistic UI updates
        dispatch(action);
        
        // If not logged in, or no supabase client, we're done.
        if (!user || !supabase) return;
        
        try {
            switch (action.type) {
                case 'ADD_OR_UPDATE_TEXT_ENTRY': {
                    const entry = action.payload;
                    const entryToUpsert = {
                        id: entry.id,
                        user_id: user.id,
                        title: entry.title,
                        text: entry.text,
                        reading_progress: entry.readingProgress,
                        analyzed_sentences: entry.analyzedSentences,
                        created_at: new Date(entry.createdAt).toISOString(),
                        updated_at: new Date(entry.updatedAt).toISOString(),
                    };
                    await supabase.from('text_entries').upsert(entryToUpsert);
                    break;
                }
                case 'CACHE_ANALYSIS': {
                    const { entryId, sentence, depth, analysis } = action.payload;
                    const { error } = await supabase.rpc('update_sentence_analysis', {
                        entry_id: entryId,
                        sentence_key: sentence,
                        depth_key: depth,
                        analysis_data: analysis,
                    });
                    if (error) throw error;
                    break;
                }
                case 'REMOVE_TEXT_ENTRY':
                    await supabase.from('text_entries').delete().match({ id: action.payload, user_id: user.id });
                    break;
                case 'CLEAR_HISTORY':
                    await supabase.from('text_entries').delete().match({ user_id: user.id });
                    break;
                case 'ADD_OR_UPDATE_REVIEW_ITEM': {
                    const item = action.payload;
                    const itemToUpsert = {
                        id: item.id,
                        user_id: user.id,
                        type: item.type,
                        content: item.content,
                        text_entry_id: item.textEntryId,
                        srs_stage: item.srsStage,
                        interval_modifier: item.intervalModifier,
                        incorrect_answer_count: item.incorrectAnswerCount,
                        next_review_date: new Date(item.nextReviewDate).toISOString(),
                        added_at: new Date(item.addedAt).toISOString(),
                    };
                    await supabase.from('review_deck').upsert(itemToUpsert);
                    break;
                }
                case 'REMOVE_REVIEW_ITEM':
                    await supabase.from('review_deck').delete().match({ id: action.payload, user_id: user.id });
                    break;
            }
        } catch (error) {
            console.error("Supabase sync failed:", error);
            // Here one could dispatch a "SYNC_FAILED" action to show a UI indicator
        }
    }, [user, supabase]);
    
    const finalDispatch = _testDispatch || syncedDispatch as Dispatch<AppDataAction>;

    useEffect(() => {
        if (_testState) {
            // If we are in a test with a provided state, we don't want the
            // initial data loading effect to run and potentially overwrite it.
            return;
        }

        const loadData = async () => {
            try {
                // Fetch all initial data in parallel
                const [history, reviewDeck, sessionCurrentId] = await Promise.all([
                    db.getAllTextEntries(),
                    db.getAllReviewItems(),
                    db.getTransientState('session_currentTextEntryId'),
                ]);

                // Validate the stored ID against the actual history
                const validCurrentId = sessionCurrentId && history.some(entry => entry.id === sessionCurrentId)
                    ? sessionCurrentId
                    : null;
                
                // If the stored ID was stale, clear it from the DB
                if (sessionCurrentId && !validCurrentId) {
                    await db.setTransientState('session_currentTextEntryId', null);
                }

                // Determine the initial view based on whether there's a valid loaded text
                const initialView = validCurrentId ? View.Reader : View.Editor;

                // Dispatch a single action to initialize the application state
                dispatch({ 
                    type: 'INITIALIZE_DATA_SUCCESS', 
                    payload: { 
                        history, 
                        reviewDeck,
                        currentTextEntryId: validCurrentId, // Pass the validated ID
                        view: initialView, // Pass the determined view
                    } 
                });

            } catch (error) {
                console.error("Failed to load app data from IndexedDB", error);
                dispatch({ type: 'INITIALIZE_DATA_FAILURE' });
            }
        };

        db.initDB().then(loadData).catch(err => {
            console.error("DB Init failed", err);
            dispatch({ type: 'INITIALIZE_DATA_FAILURE' });
        });
    }, [_testState]);

    return (
        <AppDataContext.Provider value={{ state, dispatch: finalDispatch }}>
            {children}
        </AppDataContext.Provider>
    );
};

export const useAppData = () => useContext(AppDataContext);