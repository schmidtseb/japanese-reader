/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import { 
    useAppData, 
    useSettings,
    useUI,
    View 
} from './contexts/index.ts';
import { HistoryPanel } from './components/HistoryPanel.tsx';
import { SettingsMenu } from './components/SettingsMenu.tsx';
import { loadSpeechSynthesisVoices } from './services/tts.ts';
import { useHotkeys } from './hooks/useHotkeys.ts';
import { Tooltip } from './components/Tooltip.tsx';
import { BottomSheet } from './components/BottomSheet.tsx';
import { JumpButton } from './components/JumpButton.tsx';

// Direct, static imports for development/sandbox environments
import EditorView from './features/Editor/EditorView.tsx';
import ReaderView from './features/Reader/ReaderView.tsx';
import ReadingModeView from './features/Reader/ReadingModeView.tsx';
import ReviewController from './features/Review/ReviewController.tsx';

function Header() {
  const { state, dispatch } = useAppData();
  const { dispatch: uiDispatch } = useUI();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const dueReviewCount = state.reviewDeck
    .filter(item => {
        if (state.currentTextEntryId && item.textEntryId && item.textEntryId !== state.currentTextEntryId) {
            return false;
        }
        // New items are always due. Review items are due if their date is past.
        return item.srsStage === 0 || item.nextReviewDate <= Date.now();
    }).length;
    
  const handleTitleClick = () => {
    if (state.currentTextEntryId) {
      dispatch({ type: 'SET_VIEW', payload: View.Reader });
    } else {
      dispatch({ type: 'RESET_VIEW' });
    }
  };

  return (
    <header id="app-header" className="flex justify-between items-center px-4 py-3 border-b border-border bg-gradient-to-r from-background to-surface md:rounded-t-2xl flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={handleTitleClick}
          title="Return to main screen"
          className="px-4 py-1 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg focus-ring hover-lift"
        >
          <span className="font-japanese font-bold text-primary-text text-xl select-none dark:text-white">積読</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button title="New Text" className="btn-ghost" onClick={() => dispatch({ type: 'RESET_VIEW' })}>
          <i className="bi bi-plus-lg text-xl"></i>
        </button>
        <button title="My Texts" className="btn-ghost" onClick={() => uiDispatch({ type: 'SET_HISTORY_PANEL_OPEN', payload: true })}>
          <i className="bi bi-clock-history text-xl"></i>
        </button>
        <div className="relative">
          <button title="Review Deck" className="btn-ghost" onClick={() => dispatch({ type: 'SET_VIEW', payload: View.Review })}>
            <i className="bi bi-stack text-xl"></i>
            {dueReviewCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-4 w-4 flex items-center justify-center pointer-events-none transition-opacity">
                {dueReviewCount}
              </span>
            )}
          </button>
        </div>
        <div>
          <button title="Settings" className="btn-ghost" onClick={() => setIsSettingsOpen(prev => !prev)}>
            <i className="bi bi-gear text-xl"></i>
          </button>
          {isSettingsOpen && <SettingsMenu setIsOpen={setIsSettingsOpen} />}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { state: appDataState, dispatch } = useAppData();
  const { state: settingsState } = useSettings();
  
  useHotkeys();

  useEffect(() => {
    // On app load, check if a URL was passed via the Share Target API
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');

    if (sharedUrl) {
        dispatch({ type: 'SET_URL_TO_IMPORT', payload: sharedUrl });
        // Clean the URL from the address bar to prevent re-triggering on refresh
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    loadSpeechSynthesisVoices();
  }, [dispatch]);

  useEffect(() => {
    // App Icon Badging for PWA
    if ('setAppBadge' in navigator) {
        // Calculate total due reviews across all texts, including new items.
        const totalDueCount = appDataState.reviewDeck.filter(item => item.srsStage === 0 || item.nextReviewDate <= Date.now()).length;
        
        if (totalDueCount > 0) {
            // Type assertion to satisfy TypeScript about the experimental API
            (navigator as any).setAppBadge(totalDueCount).catch((error: any) => {
                console.error('Failed to set app badge.', error);
            });
        } else {
            (navigator as any).clearAppBadge().catch((error: any) => {
                console.error('Failed to clear app badge.', error);
            });
        }
    }
  }, [appDataState.reviewDeck]);

  if (appDataState.isLoading || settingsState.isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center">
            <i className="bi bi-arrow-repeat text-4xl text-text-muted animate-spin"></i>
            <p className="mt-4 text-text-muted">Loading application data...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (appDataState.view) {
      case View.Editor:
        return <EditorView />;
      case View.Reader:
        return <ReaderView />;
      case View.ReadingMode:
        return <ReadingModeView />;
      case View.Review:
        return <ReviewController />;
      default:
        return <EditorView />;
    }
  };

  const isReadingMode = appDataState.view === View.ReadingMode;

  return (
    <div className={`w-full h-full flex flex-col ${isReadingMode ? '' : 'md:container md:mx-auto md:px-4 md:py-6'}`}>
      <main id="app" className={`bg-surface w-full flex-grow flex flex-col min-h-0 ${isReadingMode ? '' : 'md:rounded-2xl md:shadow-xl md:border border-border md:overflow-hidden'}`}>
        {appDataState.view !== View.ReadingMode && <Header />}
        {renderView()}
      </main>
      <HistoryPanel />
      <Tooltip />
      <BottomSheet />
      <JumpButton />
    </div>
  );
}