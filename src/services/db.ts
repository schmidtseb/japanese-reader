// services/db.ts
import { Settings, TextEntry, ReviewItem } from '../contexts/index.ts';
import { FONT_SIZE_STEPS, DEFAULT_FONT_SIZE_INDEX } from '../utils/constants.ts';

const DB_NAME = 'JapaneseAnalyzerDB';
const DB_VERSION = 1;

const OS_TEXT_ENTRIES = 'text_entries';
const OS_REVIEW_DECK = 'review_deck';
const OS_SETTINGS = 'settings';
const OS_TRANSIENT = 'transient_state';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(OS_TEXT_ENTRIES)) {
                const store = db.createObjectStore(OS_TEXT_ENTRIES, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(OS_REVIEW_DECK)) {
                const store = db.createObjectStore(OS_REVIEW_DECK, { keyPath: 'id' });
                store.createIndex('nextReviewDate', 'nextReviewDate', { unique: false });
                store.createIndex('textEntryId', 'textEntryId', { unique: false });
            }
            if (!db.objectStoreNames.contains(OS_SETTINGS)) {
                db.createObjectStore(OS_SETTINGS, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(OS_TRANSIENT)) {
                db.createObjectStore(OS_TRANSIENT, { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
            reject('IndexedDB error');
        };
    });

    return dbPromise;
};

const getStore = async (storeName: string, mode: IDBTransactionMode) => {
    const db = await initDB();
    return db.transaction(storeName, mode).objectStore(storeName);
};

// --- Generic CRUD ---
const get = async <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const put = async (storeName: string, item: any) => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const del = async (storeName: string, key: IDBValidKey) => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const clear = async (storeName: string) => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// --- Text Entry Specific Functions ---
export const getAllTextEntries = () => getAll<TextEntry>(OS_TEXT_ENTRIES).then(entries => entries.sort((a,b) => b.updatedAt - a.updatedAt));
export const addOrUpdateTextEntry = (entry: TextEntry) => put(OS_TEXT_ENTRIES, entry);
export const deleteTextEntry = (id: string) => del(OS_TEXT_ENTRIES, id);
export const clearTextEntries = () => clear(OS_TEXT_ENTRIES);

// --- Review Deck Specific Functions ---
export const getAllReviewItems = () => getAll<ReviewItem>(OS_REVIEW_DECK).then(items => items.sort((a,b) => a.addedAt - b.addedAt));
export const addOrUpdateReviewItem = (item: ReviewItem) => put(OS_REVIEW_DECK, item);
export const deleteReviewItem = (id: string) => del(OS_REVIEW_DECK, id);
export const clearReviewDeck = () => clear(OS_REVIEW_DECK);

// --- Settings Specific Functions ---
export const getAllSettings = async (): Promise<Settings> => {
    const settingsArray = await getAll<{ key: string, value: any }>(OS_SETTINGS);
    const settingsObject = settingsArray.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
    }, {} as any);
    
    // Return with defaults for any missing settings
    return {
        theme: settingsObject.theme || 'light',
        showFurigana: settingsObject.showFurigana !== false, // default true
        showColorCoding: settingsObject.showColorCoding !== false, // default true
        showPitchAccent: settingsObject.showPitchAccent !== false, // default true
        analysisDepth: settingsObject.analysisDepth || 'medium',
        fontSizeIndex: settingsObject.fontSizeIndex ?? DEFAULT_FONT_SIZE_INDEX,
        newWordsPerDay: settingsObject.newWordsPerDay || 10,
        userApiKey: settingsObject.userApiKey || null,
    };
};
export const saveSettings = async (settings: Partial<Settings>) => {
    const store = await getStore(OS_SETTINGS, 'readwrite');
    const promises = Object.entries(settings).map(([key, value]) => {
        return new Promise((resolve, reject) => {
            const request = store.put({ key, value });
            request.onsuccess = resolve;
            request.onerror = reject;
        });
    });
    return Promise.all(promises);
};

// --- Transient State Functions ---
export const getTransientState = (key: string) => get<{key: string, value: any}>(OS_TRANSIENT, key).then(res => res?.value);
export const setTransientState = (key: string, value: any) => put(OS_TRANSIENT, { key, value });


// Export initDB to be called at app startup
export { initDB };