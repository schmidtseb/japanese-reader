import { describe, it, expect, vi } from 'vitest';
import { appDataReducer, AppDataState, View, TextEntry, AppDataAction } from './appDataContext';
import * as db from '../services/db';

// Mock the db service
vi.mock('../services/db', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof db;
  return {
    ...actual, // Use actual implementations for type correctness if needed
    addOrUpdateTextEntry: vi.fn(),
    deleteTextEntry: vi.fn(),
    addOrUpdateReviewItem: vi.fn(),
    deleteReviewItem: vi.fn(),
    setTransientState: vi.fn(),
    clearTextEntries: vi.fn(),
  };
});

const initialState: AppDataState = {
  isLoading: false,
  view: View.Editor,
  currentTextEntryId: null,
  editingEntryId: null,
  selectedSentence: null,
  history: [],
  reviewDeck: [],
};

const mockTextEntry: TextEntry = {
    id: '1',
    title: 'Test',
    text: 'text',
    createdAt: 1,
    updatedAt: 1,
    analyzedSentences: {},
    readingProgress: 0,
};

describe('appDataReducer', () => {
  it('should handle ADD_OR_UPDATE_TEXT_ENTRY for a new entry', () => {
    const action: AppDataAction = { type: 'ADD_OR_UPDATE_TEXT_ENTRY', payload: mockTextEntry };
    const newState = appDataReducer(initialState, action);
    expect(newState.history).toHaveLength(1);
    expect(newState.history[0]).toEqual(mockTextEntry);
    expect(db.addOrUpdateTextEntry).toHaveBeenCalledWith(mockTextEntry);
  });

  it('should handle ADD_OR_UPDATE_TEXT_ENTRY for an existing entry', () => {
    const initial: AppDataState = { ...initialState, history: [mockTextEntry] };
    const updatedEntry = { ...mockTextEntry, title: 'Updated' };
    const action: AppDataAction = { type: 'ADD_OR_UPDATE_TEXT_ENTRY', payload: updatedEntry };
    const newState = appDataReducer(initial, action);
    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].title).toBe('Updated');
    expect(db.addOrUpdateTextEntry).toHaveBeenCalledWith(updatedEntry);
  });
  
  it('should handle REMOVE_TEXT_ENTRY', () => {
    const initial: AppDataState = { ...initialState, history: [mockTextEntry] };
    const action: AppDataAction = { type: 'REMOVE_TEXT_ENTRY', payload: '1' };
    const newState = appDataReducer(initial, action);
    expect(newState.history).toHaveLength(0);
    expect(db.deleteTextEntry).toHaveBeenCalledWith('1');
  });

  it('should handle CACHE_ANALYSIS', () => {
    const initial: AppDataState = { ...initialState, history: [mockTextEntry] };
    const analysisPayload = {
      entryId: '1',
      sentence: 'test sentence',
      depth: 'medium' as const,
      analysis: { foo: 'bar' },
    };
    const action: AppDataAction = { type: 'CACHE_ANALYSIS', payload: analysisPayload };
    const newState = appDataReducer(initial, action);
    const updatedEntry = newState.history[0];
    expect(updatedEntry.analyzedSentences['test sentence']['medium']).toEqual({ foo: 'bar' });
    expect(db.addOrUpdateTextEntry).toHaveBeenCalledWith(updatedEntry);
  });

  it('should handle RESET_VIEW', () => {
    const initial: AppDataState = { 
      ...initialState, 
      view: View.Reader, 
      currentTextEntryId: '123',
      selectedSentence: 'foo',
    };
    const action: AppDataAction = { type: 'RESET_VIEW' };
    const newState = appDataReducer(initial, action);
    expect(newState.view).toBe(View.Editor);
    expect(newState.currentTextEntryId).toBeNull();
    expect(newState.selectedSentence).toBeNull();
    expect(db.setTransientState).toHaveBeenCalledWith('unsaved-title', '');
    expect(db.setTransientState).toHaveBeenCalledWith('unsaved-text', '');
  });
});