import { useState, useEffect } from 'react';
import { useAppData, View, TextEntry, useSettings } from '../../contexts/index.ts';
import { useModal } from '../../components/Modal.tsx';
import { UNSAVED_TITLE_KEY, UNSAVED_TEXT_KEY } from '../../utils/constants.ts';
import { AnalysisDepth } from '../../contexts/settingsContext.tsx';

export function EditorView() {
    const { state, dispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { showAlert } = useModal();
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');

    const isApiKeySet = !!process.env.API_KEY || !!settingsState.userApiKey;
    const editingEntry = state.editingEntryId ? state.history.find(e => e.id === state.editingEntryId) : null;

    // Load unsaved text from localStorage on mount or data from entry being edited
    useEffect(() => {
        if (editingEntry) {
            setTitle(editingEntry.title);
            setText(editingEntry.text);
        } else {
            const savedTitle = localStorage.getItem(UNSAVED_TITLE_KEY) || '';
            const savedText = localStorage.getItem(UNSAVED_TEXT_KEY) || '';
            setTitle(savedTitle);
            setText(savedText);
        }
    }, [editingEntry]);

    // Persist to localStorage on change only for new texts
    useEffect(() => {
        if (!editingEntry) {
            localStorage.setItem(UNSAVED_TITLE_KEY, title);
        }
    }, [title, editingEntry]);

    useEffect(() => {
        if (!editingEntry) {
            localStorage.setItem(UNSAVED_TEXT_KEY, text);
        }
    }, [text, editingEntry]);

    const handleAnalyze = () => {
        if (!isApiKeySet) {
            showAlert('API Key is not configured. Please add your key in the settings menu.');
            return;
        }

        const trimmedText = text.trim();
        if (!trimmedText) return;

        const entryTitle = title.trim() || trimmedText.substring(0, 40) + '...';
        
        if (editingEntry) {
            const oldSentenceAnalyses = editingEntry.analyzedSentences;
            const newAnalyzedSentences: Record<string, Partial<Record<AnalysisDepth, any>>> = {};

            const sentences = trimmedText.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
            
            sentences.forEach(sentence => {
                if (oldSentenceAnalyses[sentence]) {
                    newAnalyzedSentences[sentence] = oldSentenceAnalyses[sentence];
                }
            });

            const updatedEntry: TextEntry = {
                ...editingEntry,
                title: entryTitle,
                text: trimmedText,
                updatedAt: Date.now(),
                analyzedSentences: newAnalyzedSentences,
                readingProgress: 0, // Reset progress on edit
            };

            dispatch({ type: 'ADD_OR_UPDATE_TEXT_ENTRY', payload: updatedEntry });
            dispatch({ type: 'SET_CURRENT_TEXT_ENTRY_ID', payload: updatedEntry.id });
            dispatch({ type: 'SET_VIEW', payload: View.Reader });
        } else {
            const newEntry: TextEntry = {
                id: Date.now().toString(),
                title: entryTitle,
                text: trimmedText,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                analyzedSentences: {},
                readingProgress: 0,
            };

            dispatch({ type: 'ADD_OR_UPDATE_TEXT_ENTRY', payload: newEntry });
            dispatch({ type: 'SET_CURRENT_TEXT_ENTRY_ID', payload: newEntry.id });
            dispatch({ type: 'SET_VIEW', payload: View.Reader });
        }
    };

    return (
        <div className="h-screen md:h-auto input-area p-6 bg-gradient-to-b from-background/50 to-surface">
            <div className="space-y-4">
                <div>
                    <label htmlFor="text-title-input" className="block text-sm font-medium text-text-secondary mb-2">
                        Title
                    </label>
                    <input
                        type="text"
                        id="text-title-input"
                        placeholder="Enter a title for your text..."
                        className="w-full rounded-xl border-border-subtle bg-surface shadow-sm focus-ring text-lg font-medium px-4 py-3"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="sentence-input" className="block text-sm font-medium text-text-secondary mb-2">
                        Japanese Text
                    </label>
                    <textarea
                        id="sentence-input"
                        placeholder="Enter Japanese text here. e.g., 猫が大好きです。犬も好きです。"
                        rows={6}
                        className="w-full rounded-xl border-border-subtle bg-surface shadow-sm focus-ring text-base px-4 py-3 font-japanese resize-none transition-all duration-200"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleAnalyze}
                    className="w-full btn-primary text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!text.trim() || !isApiKeySet}
                    title={!isApiKeySet ? 'API Key not configured. Please add one in settings.' : ''}
                >
                    <i className="bi bi-search"></i>
                    Analyze Text
                </button>
            </div>
        </div>
    );
};