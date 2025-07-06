import React from 'react';
import { useAppData, useUI, View, TextEntry } from '../contexts/index.ts';
import { useModal } from './Modal.tsx';

const HistoryItem: React.FC<{ entry: TextEntry }> = ({ entry }) => {
    const { dispatch: appDataDispatch } = useAppData();
    const { dispatch: uiDispatch } = useUI();
    const { showConfirmation } = useModal();

    const loadEntry = () => {
        uiDispatch({ type: 'SET_HISTORY_PANEL_OPEN', payload: false });
        appDataDispatch({ type: 'SET_CURRENT_TEXT_ENTRY_ID', payload: entry.id });
        appDataDispatch({ type: 'SET_VIEW', payload: View.Reader });
    };

    const deleteEntry = (e: React.MouseEvent) => {
        e.stopPropagation();
        showConfirmation(`Are you sure you want to delete "${entry.title}"?`, () => {
            appDataDispatch({ type: 'REMOVE_TEXT_ENTRY', payload: entry.id });
        }, { confirmText: 'Delete' });
    };

    return (
        <li className="text-entry-item group p-4 hover:bg-surface-hover transition-colors flex justify-between items-center">
            <div className="flex-grow pr-4 truncate cursor-pointer" onClick={loadEntry}>
                <span className="font-medium text-sm pointer-events-none text-text-primary" title={entry.title}>
                    {entry.title}
                </span>
                <span className="block text-xs text-text-muted mt-1 pointer-events-none">
                    Updated: {new Date(entry.updatedAt).toLocaleString()}
                </span>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                    className="p-2 rounded-full hover:bg-destructive-subtle-bg text-destructive/70 hover:text-destructive transition-colors"
                    title="Delete Text"
                    onClick={deleteEntry}
                >
                    <i className="bi bi-trash3 text-xl"></i>
                </button>
            </div>
        </li>
    );
};

export function HistoryPanel() {
    const { state: appDataState, dispatch: appDataDispatch } = useAppData();
    const { state: uiState, dispatch: uiDispatch } = useUI();
    const { showConfirmation } = useModal();

    const closePanel = () => uiDispatch({ type: 'SET_HISTORY_PANEL_OPEN', payload: false });

    const clearHistory = () => {
        if (appDataState.history.length === 0) return;
        showConfirmation('Are you sure you want to delete all your saved texts? This cannot be undone.', () => {
            appDataDispatch({ type: 'CLEAR_HISTORY' });
        }, { confirmText: 'Delete All' });
    };

    if (!uiState.isHistoryPanelOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 transition-opacity"
                onClick={closePanel}
            />
            <div
                className="fixed top-0 right-0 h-full w-full max-w-md glass-morphism shadow-2xl z-40 flex flex-col border-l border-border transition-transform duration-300 ease-in-out"
                style={{ transform: 'translateX(0%)' }}
            >
                <header className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-primary">My Texts</h2>
                    <div className="flex items-center gap-2">
                        {appDataState.history.length > 0 && (
                            <button
                                title="Delete All Texts"
                                className="p-2 rounded-lg text-text-muted hover:bg-destructive-subtle-bg hover:text-destructive transition-colors"
                                onClick={clearHistory}
                            >
                                <i className="bi bi-trash3 text-xl"></i>
                            </button>
                        )}
                        <button title="Close Panel" className="btn-ghost" onClick={closePanel}>
                            <i className="bi bi-x-lg text-xl"></i>
                        </button>
                    </div>
                </header>
                <div className="flex-grow overflow-y-auto no-scrollbar">
                    {appDataState.history.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {appDataState.history.map(entry => <HistoryItem key={entry.id} entry={entry} />)}
                        </ul>
                    ) : (
                        <div className="text-center p-8">
                             <i className="bi bi-file-earmark-text text-5xl text-text-muted/50 mx-auto mb-4" aria-hidden="true"></i>
                            <p className="text-text-muted">You have no saved texts yet.</p>
                            <p className="text-sm text-text-muted/70 mt-1">Start by analyzing some Japanese text!</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};