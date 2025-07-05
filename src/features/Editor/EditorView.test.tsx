import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { screen, fireEvent, render, waitFor } from '@testing-library/react';
import { EditorView } from './EditorView';
import { AppDataProvider, AppDataState, SettingsProvider, SettingsState, UIProvider, View, TextEntry } from '../../contexts';
import { ModalProvider } from '../../components/Modal.tsx';
import * as db from '../../services/db.ts';

// Mock the db service which is used internally by the component's effects
vi.mock('../../services/db');

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

// A custom render function that wraps the component in necessary providers.
// We can pass initial state to the providers to set up different test scenarios.
const renderEditorView = (initialAppData: Partial<AppDataState> = {}, initialSettings: Partial<SettingsState> = {}) => {
  const dispatch = vi.fn();
  const fullInitialAppData: AppDataState = {
    isLoading: false,
    view: View.Editor,
    currentTextEntryId: null,
    editingEntryId: null,
    selectedSentence: null,
    history: [],
    reviewDeck: [],
    ...initialAppData,
  };
  
  const fullInitialSettings: SettingsState = { ...mockSettings, ...initialSettings };

  render(
    <SettingsProvider _testState={fullInitialSettings}>
        <UIProvider>
            <AppDataProvider _testDispatch={dispatch} _testState={fullInitialAppData}>
                <ModalProvider>
                    <EditorView />
                </ModalProvider>
            </AppDataProvider>
        </UIProvider>
    </SettingsProvider>
  );

  return { dispatch };
};

describe('EditorView', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Mock db functions used by EditorView effects
        vi.mocked(db.getTransientState).mockResolvedValue('');
        vi.mocked(db.setTransientState).mockResolvedValue(undefined);
    });

    it('renders title and text inputs, with analyze button initially disabled', () => {
        renderEditorView();
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/japanese text/i)).toBeInTheDocument();
        const analyzeButton = screen.getByRole('button', { name: /analyze text/i });
        expect(analyzeButton).toBeInTheDocument();
        expect(analyzeButton).toBeDisabled();
    });
    
    it('enables analyze button only when text is present', () => {
        renderEditorView();
        const analyzeButton = screen.getByRole('button', { name: /analyze text/i });
        const textArea = screen.getByLabelText(/japanese text/i);

        expect(analyzeButton).toBeDisabled();
        
        fireEvent.change(textArea, { target: { value: 'こんにちは' } });
        expect(analyzeButton).not.toBeDisabled();

        fireEvent.change(textArea, { target: { value: '   ' } }); // whitespace only
        expect(analyzeButton).toBeDisabled();
    });

    it('shows API key warning and keeps button disabled if no key is configured', () => {
        renderEditorView({}, { userApiKey: null });
        expect(screen.getByText(/please set your api key/i)).toBeInTheDocument();
        
        const analyzeButton = screen.getByRole('button', { name: /analyze text/i });
        const textArea = screen.getByLabelText(/japanese text/i);
        fireEvent.change(textArea, { target: { value: 'こんにちは' } });

        expect(analyzeButton).toBeDisabled();
    });

    it('dispatches actions to create a new entry on analyze', async () => {
        const { dispatch } = renderEditorView();
        const titleInput = screen.getByLabelText(/title/i);
        const textArea = screen.getByLabelText(/japanese text/i);
        const analyzeButton = screen.getByRole('button', { name: /analyze text/i });

        fireEvent.change(titleInput, { target: { value: 'My Title' } });
        fireEvent.change(textArea, { target: { value: 'こんにちは' } });
        fireEvent.click(analyzeButton);

        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'ADD_OR_UPDATE_TEXT_ENTRY',
                payload: expect.objectContaining({
                    title: 'My Title',
                    text: 'こんにちは'
                })
            }));
        });
        
        // The other dispatches happen based on the result of the first one,
        // which we can't easily simulate here without a full reducer setup.
        // But we can check that they are called.
        await waitFor(() => {
            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'SET_CURRENT_TEXT_ENTRY_ID',
            }));
            expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VIEW', payload: View.Reader });
        });
    });

    it('loads an existing entry when in editing mode', async () => {
        const editingEntry: TextEntry = {
            id: '123',
            title: 'Editing Title',
            text: 'Editing Text',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            readingProgress: 0,
            analyzedSentences: {}
        };
        renderEditorView({ editingEntryId: '123', history: [editingEntry] });

        await waitFor(() => {
            expect(screen.getByLabelText(/title/i)).toHaveValue('Editing Title');
            expect(screen.getByLabelText(/japanese text/i)).toHaveValue('Editing Text');
        });
    });

    it('loads unsaved text from transient state for a new entry', async () => {
        vi.mocked(db.getTransientState)
            .mockImplementation(async (key) => {
                if (key === 'unsaved-title') return 'Unsaved Title';
                if (key === 'unsaved-text') return 'Unsaved Text';
                return '';
            });

        renderEditorView();
        
        await waitFor(() => {
            expect(screen.getByLabelText(/title/i)).toHaveValue('Unsaved Title');
            expect(screen.getByLabelText(/japanese text/i)).toHaveValue('Unsaved Text');
        });
    });
});