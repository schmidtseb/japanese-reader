import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen, fireEvent, render, waitFor } from '@testing-library/react';
import { AppDataProvider, AppDataState, SettingsProvider, SettingsState, UIProvider, View, TextEntry } from '../../contexts';
import { ModalProvider } from '../../components/Modal.tsx';
import { ReadingModeView } from './ReadingModeView';
import { useSentenceAnalysis } from '../../hooks/useSentenceAnalysis.ts';

// Mock the analysis hook, as it makes external API calls
vi.mock('../../hooks/useSentenceAnalysis', () => ({
    useSentenceAnalysis: vi.fn(),
}));
const mockUseSentenceAnalysis = vi.mocked(useSentenceAnalysis);

// Mock the prefetch hook as well
vi.mock('../../services/gemini', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        useAnalyzeSentence: () => ({ execute: vi.fn().mockResolvedValue(null) }),
        useGenerateComprehensionQuiz: () => ({ execute: vi.fn(), reset: vi.fn() }),
    };
});

const mockSettings: SettingsState = {
  isLoading: false,
  theme: 'light',
  showFurigana: true,
  showColorCoding: true,
  showPitchAccent: true,
  analysisDepth: 'medium',
  fontSizeIndex: 2,
  newWordsPerDay: 10,
  userApiKey: 'test-key',
};

const mockTextEntry: TextEntry = {
    id: 'entry-1',
    title: 'テストテキスト',
    text: '一つ目の文。二つ目の文。',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    readingProgress: 0,
    analyzedSentences: {}
};

const mockAnalysis = {
    original_japanese_sentence: '一つ目の文。',
    english_translation: 'Sentence one.',
    analysis: [],
    grammar_patterns: [{ pattern_name: 'Test Pattern', explanation: 'An explanation', constituent_indices: [] }],
};

const renderReadingModeView = (initialAppData: Partial<AppDataState> = {}) => {
  const dispatch = vi.fn();
  const uiDispatch = vi.fn();

  const fullInitialAppData: AppDataState = {
    isLoading: false,
    view: View.ReadingMode,
    currentTextEntryId: 'entry-1',
    editingEntryId: null,
    selectedSentence: null,
    history: [mockTextEntry],
    reviewDeck: [],
    urlToImport: null,
    ...initialAppData,
  };
  
  render(
    <SettingsProvider _testState={mockSettings}>
        <UIProvider>
            <AppDataProvider _testDispatch={dispatch} _testState={fullInitialAppData}>
                <ModalProvider>
                    <ReadingModeView />
                </ModalProvider>
            </AppDataProvider>
        </UIProvider>
    </SettingsProvider>
  );

  return { dispatch, uiDispatch };
};

describe('ReadingModeView', () => {

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders a loading placeholder when analysis is loading', () => {
        mockUseSentenceAnalysis.mockReturnValue({ analysis: null, isLoading: true, error: null, reanalyze: vi.fn() });
        renderReadingModeView();
        expect(screen.getByText('一つ目の文。')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveClass('animate-spin'); // The spinning loader icon
    });

    it('renders an error component when analysis fails', () => {
        mockUseSentenceAnalysis.mockReturnValue({ analysis: null, isLoading: false, error: new Error('API Fail'), reanalyze: vi.fn() });
        renderReadingModeView();
        expect(screen.getByText('API Error')).toBeInTheDocument();
        expect(screen.getByText('API Fail')).toBeInTheDocument();
    });

    it('renders the AnalysisView when analysis is successful', async () => {
        mockUseSentenceAnalysis.mockReturnValue({ analysis: mockAnalysis, isLoading: false, error: null, reanalyze: vi.fn() });
        renderReadingModeView();
        // AnalysisView has this header when grammar patterns are present
        await waitFor(() => {
            expect(screen.getByText('Grammar & Phrases')).toBeInTheDocument();
        });
    });

    it('dispatches NAVIGATE_SENTENCE on next button click', async () => {
        mockUseSentenceAnalysis.mockReturnValue({ analysis: mockAnalysis, isLoading: false, error: null, reanalyze: vi.fn() });
        const { dispatch } = renderReadingModeView();
        
        const nextButton = screen.getByLabelText(/next sentence/i);
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith({
                type: 'NAVIGATE_SENTENCE',
                payload: { direction: 'next' }
            });
        });
    });

     it('dispatches NAVIGATE_SENTENCE on prev button click', async () => {
        mockUseSentenceAnalysis.mockReturnValue({ analysis: mockAnalysis, isLoading: false, error: null, reanalyze: vi.fn() });
        // Start on the second sentence to enable the prev button
        const { dispatch } = renderReadingModeView({ 
            history: [{...mockTextEntry, readingProgress: 1 }]
        });
        
        const prevButton = screen.getByLabelText(/previous sentence/i);
        fireEvent.click(prevButton);

        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith({
                type: 'NAVIGATE_SENTENCE',
                payload: { direction: 'prev' }
            });
        });
    });
    
    it('dispatches JUMP_TO_SENTENCE when header input is used', async () => {
        mockUseSentenceAnalysis.mockReturnValue({ analysis: mockAnalysis, isLoading: false, error: null, reanalyze: vi.fn() });
        const { dispatch } = renderReadingModeView();
        
        const input = screen.getByTitle(/enter sentence number/i);
        fireEvent.change(input, { target: { value: '2' }});
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }); // Jumps on Enter key

        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith({
                type: 'JUMP_TO_SENTENCE',
                payload: { index: 1 } // index is 0-based
            });
        });
    });

    it('dispatches SET_VIEW to exit reading mode', async () => {
        mockUseSentenceAnalysis.mockReturnValue({ analysis: mockAnalysis, isLoading: false, error: null, reanalyze: vi.fn() });
        const { dispatch } = renderReadingModeView();

        const exitButton = screen.getByTitle(/exit reading mode/i);
        fireEvent.click(exitButton);

        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET_VIEW',
                payload: View.Reader
            });
        });
    });
});