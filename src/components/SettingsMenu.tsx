




import React, { useRef, useEffect, useState } from 'react';
import { useAppData, useSettings, AnalysisDepth, depthLevels } from '../contexts/index.ts';
import { useModal } from './Modal.tsx';
import { FONT_SIZE_STEPS } from '../utils/constants.ts';
import * as db from '../services/db.ts';

const Toggle = ({ label, shortcut, checked, onChange, id }: { label: string, shortcut?: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, id: string }) => (
    <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-text-secondary cursor-pointer">
            {label} {shortcut && <span className="text-xs text-text-muted">({shortcut})</span>}
        </label>
        <label htmlFor={id} className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-subtle transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 cursor-pointer">
            <input type="checkbox" id={id} className="sr-only peer" checked={checked} onChange={onChange} />
            <span className="ml-1 inline-block h-4 w-4 transform rounded-full bg-surface transition-transform peer-checked:translate-x-5 peer-checked:bg-primary shadow-sm"></span>
        </label>
    </div>
);


export function SettingsMenu({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
    const { state: settingsState, dispatch: settingsDispatch } = useSettings();
    const { dispatch: appDataDispatch } = useAppData();
    const { showAlert, showConfirmation } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [setIsOpen]);

    useEffect(() => {
        setApiKeyInput(settingsState.userApiKey || '');
    }, [settingsState.userApiKey]);
    
    const handleSettingChange = (payload: Partial<typeof settingsState>) => {
        settingsDispatch({ type: 'UPDATE_SETTINGS', payload });
    };

    const handleSaveApiKey = () => {
        handleSettingChange({ userApiKey: apiKeyInput });
        showAlert('API Key settings updated.');
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (!data.history || !data.settings || !data.reviewDeck) throw new Error("Invalid backup file structure.");

                showConfirmation(
                    "Importing will overwrite your current history, review deck, and settings. Are you sure you want to continue?",
                    async () => {
                        try {
                            // Clear existing data
                            await Promise.all([db.clearTextEntries(), db.clearReviewDeck()]);
                            
                            // Import new data
                            await Promise.all([
                                ...data.history.map((entry: any) => db.addOrUpdateTextEntry(entry)),
                                ...data.reviewDeck.map((item: any) => db.addOrUpdateReviewItem(item)),
                                db.saveSettings(data.settings)
                            ]);
                            
                            // Refresh contexts
                            appDataDispatch({ type: 'SET_HISTORY', payload: data.history || [] });
                            appDataDispatch({ type: 'SET_REVIEW_DECK', payload: data.reviewDeck || [] });
                            settingsDispatch({ type: 'UPDATE_SETTINGS', payload: data.settings });
                            
                            showAlert("Import successful!", { onOk: () => setIsOpen(false) });
                            appDataDispatch({ type: 'RESET_VIEW' });
                        } catch (importErr) {
                             showAlert(`Import failed during database operation: ${importErr instanceof Error ? importErr.message : 'Unknown error.'}`, { onOk: () => setIsOpen(false) });
                        }
                    },
                    { confirmText: "Import", confirmClass: "bg-accent hover:bg-accent/90" }
                );
            } catch (err) {
                showAlert(`Import failed: ${err instanceof Error ? err.message : 'Could not read file.'}`, { onOk: () => setIsOpen(false) });
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleExport = async () => {
        try {
            const [history, reviewDeck, settings] = await Promise.all([
                db.getAllTextEntries(),
                db.getAllReviewItems(),
                db.getAllSettings()
            ]);

            const backupData = {
                version: '3.0-indexeddb',
                exportedAt: Date.now(),
                history,
                reviewDeck,
                settings,
            };
            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `japanese-analyzer-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            showAlert(`Export failed: ${err instanceof Error ? err.message : 'Could not read data from database.'}`);
        }
    };

    const analysisDepthIndex = depthLevels.indexOf(settingsState.analysisDepth);

    return (
        <>
            <div
                className="fixed inset-0 bg-background/80 backdrop-blur-lg z-[80]"
                onClick={() => setIsOpen(false)}
            ></div>
            <div ref={menuRef} className="fixed top-20 right-4 flex flex-col w-[95vw] max-w-sm glass-morphism rounded-xl shadow-2xl ring-1 ring-border-subtle z-[90] origin-top-right animate-fade-in max-h-[calc(100vh-12rem)]">
                <header className="flex items-center justify-between p-4 border-b border-border-subtle flex-shrink-0">
                    <h3 className="text-lg font-semibold text-text-primary">Settings</h3>
                    <button onClick={() => setIsOpen(false)} className="btn-ghost p-1" title="Close Settings (Esc)">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </header>
                <div className="p-4 space-y-4 overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <Toggle id="pitch-accent-checkbox" label="Pitch Accent" checked={settingsState.showPitchAccent} onChange={(e) => handleSettingChange({ showPitchAccent: e.target.checked })} />
                        <Toggle id="furigana-checkbox" label="Furigana" shortcut="F" checked={settingsState.showFurigana} onChange={(e) => handleSettingChange({ showFurigana: e.target.checked })} />
                        <Toggle id="color-coding-checkbox" label="POS Colors" shortcut="C" checked={settingsState.showColorCoding} onChange={(e) => handleSettingChange({ showColorCoding: e.target.checked })} />
                        <Toggle id="theme-checkbox" label="Dark Mode" checked={settingsState.theme === 'dark'} onChange={(e) => handleSettingChange({ theme: e.target.checked ? 'dark' : 'light' })} />
                    </div>
                    <hr className="border-border-subtle" />
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="analysis-depth-slider" className="text-sm font-medium text-text-secondary">Analysis Depth</label>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary-subtle-bg text-primary-subtle-text capitalize">
                                    {settingsState.analysisDepth}
                                </span>
                            </div>
                            <input type="range" id="analysis-depth-slider" min="0" max="2" step="1" value={analysisDepthIndex}
                                onChange={(e) => handleSettingChange({ analysisDepth: depthLevels[parseInt(e.target.value)] as AnalysisDepth })}
                                className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="font-size-slider" className="text-sm font-medium text-text-secondary">Font Size</label>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary-subtle-bg text-primary-subtle-text">
                                    {FONT_SIZE_STEPS[settingsState.fontSizeIndex].label}
                                </span>
                            </div>
                            <input type="range" id="font-size-slider" min="0" max={FONT_SIZE_STEPS.length - 1} step="1" value={settingsState.fontSizeIndex}
                                onChange={(e) => handleSettingChange({ fontSizeIndex: parseInt(e.target.value) })}
                                className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="new-words-slider" className="text-sm font-medium text-text-secondary">New Words Per Day</label>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary-subtle-bg text-primary-subtle-text">
                                    {settingsState.newWordsPerDay}
                                </span>
                            </div>
                            <input type="range" id="new-words-slider" min="5" max="50" step="5" value={settingsState.newWordsPerDay}
                                onChange={(e) => handleSettingChange({ newWordsPerDay: parseInt(e.target.value, 10) })}
                                className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                    <hr className="border-border-subtle" />
                    <div>
                        <p className="text-sm font-medium text-text-secondary mb-3">API Key Management</p>
                        <div className="relative flex items-center">
                            <input
                                type={isKeyVisible ? 'text' : 'password'}
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="Enter your Gemini API Key"
                                className="w-full rounded-lg border-border-subtle bg-surface-soft shadow-sm focus-ring text-sm px-4 py-2 pr-10"
                                aria-label="Gemini API Key"
                            />
                            <button
                                type="button"
                                className="absolute right-2 text-text-muted hover:text-text-primary p-1"
                                onClick={() => setIsKeyVisible(!isKeyVisible)}
                                title={isKeyVisible ? 'Hide key' : 'Show key'}
                            >
                                <i className={`bi ${isKeyVisible ? 'bi-eye-slash' : 'bi-eye'} text-base`}></i>
                            </button>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSaveApiKey} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-primary/80 text-primary-text hover:bg-primary transition-colors inline-flex items-center justify-center gap-2">
                                <i className="bi bi-save text-base"></i>
                                Save Key
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-2 px-1">
                            {settingsState.userApiKey 
                                ? "Using your custom API key." 
                                : "Using the default application key."}
                            Your key is stored in your browser's database.
                        </p>
                    </div>
                    <hr className="border-border-subtle" />
                    <div>
                        <p className="text-sm font-medium text-text-secondary mb-3">Data Management</p>
                        <div className="flex gap-2">
                            <button onClick={handleExport} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-surface-soft text-text-secondary hover:bg-surface-hover transition-colors inline-flex items-center justify-center gap-2">
                                <i className="bi bi-download text-base"></i>
                                Export
                            </button>
                            <label className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-surface-soft text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer inline-flex items-center justify-center gap-2">
                                <i className="bi bi-upload text-base"></i>
                                Import
                                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};