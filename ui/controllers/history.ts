// ui/controllers/history.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';
import { showConfirmationModal } from '../modal.ts';
import { loadTextEntry, resetToNewTextView } from '../actions.ts';
import { renderHistoryPanel } from '../render/history.ts';
import { HISTORY_KEY } from '../handlers.ts';

/** Saves history to localStorage. */
export function saveHistory() {
    try {
        state.textHistory.sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(state.textHistory));
    } catch (e) {
        console.error("Failed to save history to localStorage", e);
    }
}

/** Loads history from localStorage. */
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem(HISTORY_KEY);
        if (savedHistory) {
            state.setTextHistory(JSON.parse(savedHistory));
        }
    } catch (e) {
        console.error("Failed to load or parse history from localStorage", e);
        state.setTextHistory([]);
    }
    renderHistoryPanel();
}

/** Sets up handlers for the history panel. */
function setupHistoryPanel() {
    const showPanel = () => {
        dom.historyPanel.classList.remove('translate-x-full');
        dom.historyPanelOverlay.classList.remove('invisible', 'opacity-0');
    };
    const hidePanel = () => {
        dom.historyPanel.classList.add('translate-x-full');
        dom.historyPanelOverlay.classList.add('invisible', 'opacity-0');
    };

    dom.historyButton.addEventListener('click', showPanel);
    dom.closeHistoryButton.addEventListener('click', hidePanel);
    dom.historyPanelOverlay.addEventListener('click', hidePanel);

    dom.clearHistoryButton.addEventListener('click', () => {
        if (state.textHistory.length === 0) return;
        showConfirmationModal('Are you sure you want to delete all your saved texts? This cannot be undone.', () => {
            state.clearAllHistory();
            saveHistory();
            renderHistoryPanel();
            if (state.currentTextEntryId) {
                resetToNewTextView();
            }
        }, { confirmText: 'Delete All' });
    });

    dom.historyList.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const actionTarget = target.closest<HTMLElement>('[data-action]');

        if (!actionTarget) return;

        const { action, entryId } = actionTarget.dataset;
        if (!action || !entryId) return;

        const entry = state.findTextEntryById(entryId);
        if (!entry) return;

        switch (action) {
            case 'load':
                hidePanel();
                // Clear unsaved text when loading from history to avoid confusion
                localStorage.removeItem('japanese-analyzer-unsaved-title');
                localStorage.removeItem('japanese-analyzer-unsaved-text');
                loadTextEntry(entryId);
                break;
            case 'delete':
                showConfirmationModal(`Are you sure you want to delete "${entry.title}"?`, () => {
                    const wasCurrentEntry = state.currentTextEntryId === entryId;
                    state.removeTextEntry(entryId);
                    saveHistory();
                    renderHistoryPanel();
                    if (wasCurrentEntry) {
                        resetToNewTextView();
                    }
                }, { confirmText: 'Delete' });
                break;
        }
    });
}

export function initializeHistory() {
    loadHistory();
    setupHistoryPanel();
}
