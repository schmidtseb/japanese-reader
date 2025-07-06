


import { useState, useEffect, useCallback } from 'react';
import { useAppData, View, TextEntry, useSettings } from '../../contexts/index.ts';
import { useModal } from '../../components/Modal.tsx';
import * as db from '../../services/db.ts';
import { AnalysisDepth } from '../../contexts/settingsContext.tsx';
import { extractTextFromUrl } from '../../services/gemini.ts';

const UNSAVED_TITLE_KEY = 'unsaved-title';
const UNSAVED_TEXT_KEY = 'unsaved-text';

type ActiveTab = 'manual' | 'url';

export default function EditorView() {
    const { state, dispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { showAlert } = useModal();
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);
    
    const [url, setUrl] = useState('');
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const [fetchUrlError, setFetchUrlError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<ActiveTab>('manual');

    const isApiKeySet = !!process.env.API_KEY || !!settingsState.userApiKey;
    const editingEntry = state.editingEntryId ? state.history.find(e => e.id === state.editingEntryId) : null;

    useEffect(() => {
        const loadInitialData = async () => {
            if (editingEntry) {
                setTitle(editingEntry.title);
                setText(editingEntry.text);
                setActiveTab('manual'); // When editing, always start on manual tab
            } else {
                const savedTitle = await db.getTransientState(UNSAVED_TITLE_KEY) || '';
                const savedText = await db.getTransientState(UNSAVED_TEXT_KEY) || '';
                setTitle(savedTitle);
                setText(savedText);
            }
            setIsLoaded(true);
        };
        loadInitialData();
    }, [editingEntry]);

    // Persist to IndexedDB on change only for new texts
    useEffect(() => {
        if (isLoaded && !editingEntry) {
            db.setTransientState(UNSAVED_TITLE_KEY, title);
        }
    }, [title, editingEntry, isLoaded]);

    useEffect(() => {
        if (isLoaded && !editingEntry) {
            db.setTransientState(UNSAVED_TEXT_KEY, text);
        }
    }, [text, editingEntry, isLoaded]);

    const triggerUrlFetch = useCallback(async (urlToFetch: string) => {
        setFetchUrlError(null);
        setIsFetchingUrl(true);
        try {
            const result = await extractTextFromUrl(urlToFetch);
            setTitle(result.title);
            setText(result.japanese_text);
            setUrl('');
            setActiveTab('manual');
        } catch (err) {
            // Put the failed URL back in the input for the user to see/correct
            setUrl(urlToFetch);
            setActiveTab('url');
            setFetchUrlError((err as Error).message);
        } finally {
            setIsFetchingUrl(false);
        }
    }, []);

    const handleFetchUrl = useCallback(async () => {
        if (!url) {
            setFetchUrlError("Please enter a URL.");
            return;
        }
        try {
            new URL(url);
        } catch (_) {
            setFetchUrlError("Invalid URL format.");
            return;
        }
        await triggerUrlFetch(url);
    }, [url, triggerUrlFetch]);
    
    // Handle incoming shared URL from PWA share_target
    useEffect(() => {
        if (state.urlToImport) {
            // Clear the URL from global state first to prevent re-triggering
            dispatch({ type: 'CLEAR_URL_TO_IMPORT' });
            triggerUrlFetch(state.urlToImport);
        }
    }, [state.urlToImport, dispatch, triggerUrlFetch]);

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
    
    const tabBaseClass = "px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-lg";
    const activeTabClass = "border-b-2 border-primary text-primary";
    const inactiveTabClass = "text-text-muted hover:text-text-primary hover:bg-surface-hover";

    return (
        <div className="h-screen md:h-auto input-area p-6 bg-gradient-to-b from-background/50 to-surface overflow-y-auto no-scrollbar flex flex-col">
            <div className="space-y-6 flex-grow flex flex-col">
                {/* Tabs */}
                <div className="border-b border-border-subtle flex-shrink-0">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`${tabBaseClass} ${activeTab === 'manual' ? activeTabClass : inactiveTabClass}`}
                            aria-current={activeTab === 'manual' ? 'page' : undefined}
                        >
                            Manual Input
                        </button>
                        <button
                            onClick={() => setActiveTab('url')}
                            className={`${tabBaseClass} ${activeTab === 'url' ? activeTabClass : inactiveTabClass}`}
                            aria-current={activeTab === 'url' ? 'page' : undefined}
                        >
                            Import from URL
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-grow min-h-0 py-2">
                    {activeTab === 'manual' && (
                        <div className="space-y-4 animate-fade-in">
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
                                    rows={8}
                                    className="w-full rounded-xl border-border-subtle bg-surface shadow-sm focus-ring text-base px-4 py-3 font-japanese resize-y transition-all duration-200"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === 'url' && (
                        <div className="space-y-4 animate-fade-in">
                            <label htmlFor="url-input" className="block text-sm font-medium text-text-secondary">
                                Paste article URL
                            </label>
                            <div className="flex items-start gap-2">
                                <input
                                    type="url"
                                    id="url-input"
                                    placeholder="https://example.com/japanese-article"
                                    className="w-full rounded-xl border-border-subtle bg-surface shadow-sm focus-ring text-base px-4 py-3"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                                    disabled={isFetchingUrl}
                                />
                                 <button 
                                    onClick={handleFetchUrl} 
                                    disabled={isFetchingUrl || !url.trim()}
                                    className="px-4 py-3 rounded-xl bg-accent text-primary-text font-medium hover:bg-accent/90 transition-colors shadow-sm focus-ring disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
                                    title="Fetch content from URL"
                                >
                                    {isFetchingUrl ? (
                                        <i className="bi bi-arrow-repeat text-xl animate-spin"></i>
                                    ) : (
                                        <i className="bi bi-cloud-arrow-down text-xl"></i>
                                    )}
                                </button>
                            </div>
                            {fetchUrlError && (
                                 <p className="text-sm text-destructive mt-1.5 px-2">
                                    <i className="bi bi-exclamation-circle-fill mr-1 align-middle"></i>
                                    {fetchUrlError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="mt-auto flex-shrink-0 pt-4">
                    <button
                        onClick={handleAnalyze}
                        className="w-full btn-primary text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!text.trim() || !isApiKeySet}
                        title={!isApiKeySet ? 'API Key not configured. Please add one in settings.' : ''}
                    >
                        <i className="bi bi-search"></i>
                        Analyze Text
                    </button>
                    {!isApiKeySet && (
                        <p className="text-center text-sm text-warning-text mt-3">
                            <i className="bi bi-exclamation-triangle-fill mr-1 align-middle"></i>
                            Please set your API key in settings to enable analysis.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};