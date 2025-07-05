import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Note: We will dynamically import 'db' inside the tests after resetting modules
import type { TextEntry, ReviewItem, Settings } from '../contexts';

// IMPORTANT: We use vi.resetModules() to ensure that the singleton dbPromise
// in db.ts is reset for each test. This prevents state from leaking between tests.

describe('db service', () => {
  let db: typeof import('./db');

  beforeEach(async () => {
    vi.resetModules();
    // Re-import 'db.ts' to get a fresh instance for each test
    db = await import('./db');
    
    // initDB should now run in a clean environment for each test
    await db.initDB();
    
    // Clear all stores before each test to ensure isolation
    await db.clearTextEntries();
    await db.clearReviewDeck();
    
    const idb = await db.initDB();
    const tx = idb.transaction(['settings', 'transient_state'], 'readwrite');
    const p1 = new Promise<void>(res => { tx.objectStore('settings').clear().onsuccess = () => res(); });
    const p2 = new Promise<void>(res => { tx.objectStore('transient_state').clear().onsuccess = () => res(); });
    await Promise.all([p1, p2]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Entries', () => {
    it('should add and retrieve a text entry', async () => {
      const newEntry: TextEntry = { id: '1', title: 'Test', text: 'Text', createdAt: 1, updatedAt: 1, readingProgress: 0, analyzedSentences: {} };
      await db.addOrUpdateTextEntry(newEntry);
      const entries = await db.getAllTextEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(newEntry);
    });

    it('should update an existing text entry', async () => {
      const entry: TextEntry = { id: '1', title: 'Test', text: 'Text', createdAt: 1, updatedAt: 1, readingProgress: 0, analyzedSentences: {} };
      await db.addOrUpdateTextEntry(entry);
      const updatedEntry: TextEntry = { ...entry, title: 'Updated' };
      await db.addOrUpdateTextEntry(updatedEntry);
      const entries = await db.getAllTextEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Updated');
    });

    it('should delete a text entry', async () => {
      const entry: TextEntry = { id: '1', title: 'Test', text: 'Text', createdAt: 1, updatedAt: 1, readingProgress: 0, analyzedSentences: {} };
      await db.addOrUpdateTextEntry(entry);
      await db.deleteTextEntry('1');
      const entries = await db.getAllTextEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('Review Deck', () => {
    it('should add and retrieve a review item', async () => {
      const newItem: ReviewItem = { id: 'word-1', type: 'word', content: {}, srsStage: 0, incorrectAnswerCount: 0, nextReviewDate: 1, addedAt: 1 };
      await db.addOrUpdateReviewItem(newItem);
      const items = await db.getAllReviewItems();
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(newItem);
    });
  });

  describe('Settings', () => {
    it('should return default settings when none are saved', async () => {
      const settings = await db.getAllSettings();
      expect(settings.theme).toBe('light');
      expect(settings.newWordsPerDay).toBe(10);
      expect(settings.userApiKey).toBeNull();
    });

    it('should save and retrieve partial settings', async () => {
      await db.saveSettings({ theme: 'dark', userApiKey: 'test-key' });
      const settings = await db.getAllSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.userApiKey).toBe('test-key');
      expect(settings.showFurigana).toBe(true); // check a default is still there
    });
  });
  
  describe('Transient State', () => {
    it('should set and get transient state', async () => {
      await db.setTransientState('test-key', { value: 123 });
      const state = await db.getTransientState('test-key');
      expect(state).toEqual({ value: 123 });
    });

    it('should return undefined for non-existent transient state', async () => {
      const state = await db.getTransientState('non-existent-key');
      expect(state).toBeUndefined();
    });
  });
});