// contexts/uiContext.tsx
import React, { createContext, useReducer, useContext, Dispatch } from 'react';

// --- TYPE DEFINITIONS ---
export interface UIState {
    isHistoryPanelOpen: boolean;
    tooltip: {
        visible: boolean;
        content: React.ReactNode;
        position: { top: number; left: number };
        pinned: boolean;
        targetElement: HTMLElement | null;
    };
    bottomSheet: {
        visible: boolean;
        content: { title: string; body: React.ReactNode };
        targetElement: HTMLElement | null;
    };
}

// --- ACTIONS ---
type Action =
  | { type: 'SET_HISTORY_PANEL_OPEN'; payload: boolean }
  | { type: 'SHOW_TOOLTIP'; payload: { content: React.ReactNode; position: { top: number; left: number }; targetElement: HTMLElement | null } }
  | { type: 'HIDE_TOOLTIP' }
  | { type: 'PIN_TOOLTIP'; payload: { content: React.ReactNode; position: { top: number; left: number }; targetElement: HTMLElement | null } }
  | { type: 'SHOW_BOTTOM_SHEET'; payload: { content: { title: string; body: React.ReactNode }; targetElement: HTMLElement | null } }
  | { type: 'HIDE_BOTTOM_SHEET' };

// --- INITIAL STATE ---
export const initialState: UIState = {
    isHistoryPanelOpen: false,
    tooltip: { visible: false, content: null, position: { top: 0, left: 0 }, pinned: false, targetElement: null },
    bottomSheet: { visible: false, content: { title: '', body: null }, targetElement: null },
};

// --- REDUCER ---
const uiReducer = (state: UIState, action: Action): UIState => {
    switch (action.type) {
        case 'SET_HISTORY_PANEL_OPEN':
            return { ...state, isHistoryPanelOpen: action.payload };

        case 'SHOW_TOOLTIP':
            if (state.tooltip.pinned) return state;
            return { ...state, tooltip: { ...state.tooltip, visible: true, pinned: false, ...action.payload } };
        
        case 'HIDE_TOOLTIP':
            return { ...state, tooltip: { ...initialState.tooltip } };
        
        case 'PIN_TOOLTIP':
            if (state.tooltip.targetElement === action.payload.targetElement && state.tooltip.pinned) {
                return { ...state, tooltip: { ...initialState.tooltip } };
            }
            return { ...state, tooltip: { visible: true, pinned: true, ...action.payload } };
        
        case 'SHOW_BOTTOM_SHEET':
            document.body.classList.add('overflow-hidden', 'md:overflow-auto');
            return { ...state, bottomSheet: { visible: true, ...action.payload } };

        case 'HIDE_BOTTOM_SHEET':
            document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
            return { ...state, bottomSheet: { ...initialState.bottomSheet } };
            
        default:
            return state;
    }
};

// --- CONTEXT & PROVIDER ---
const UIContext = createContext<{ state: UIState; dispatch: Dispatch<Action> }>({
    state: initialState,
    dispatch: () => null
});

export function UIProvider({ children }: { children?: React.ReactNode }) {
    const [state, dispatch] = useReducer(uiReducer, initialState);
    return (
        <UIContext.Provider value={{ state, dispatch }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);