// src/components/AccountManager.tsx
import React, { useState } from 'react';
import { useAuth, useAppData, TextEntry, ReviewItem } from '../contexts/index.ts';
import { useModal } from './Modal.tsx';
import * as db from '../services/db.ts';

async function syncData(userId: string, appDispatch: React.Dispatch<any>, supabase: any) {
    if (!supabase) return;

    // 1. Fetch remote data
    const { data: remoteEntries, error: entriesError } = await supabase.from('text_entries').select('*').eq('user_id', userId);
    const { data: remoteDeck, error: deckError } = await supabase.from('review_deck').select('*').eq('user_id', userId);

    if (entriesError || deckError) {
        throw entriesError || deckError;
    }

    // 2. Fetch local data
    const localEntries = await db.getAllTextEntries();
    const localDeck = await db.getAllReviewItems();

    // 3. Merge data
    const mergedEntriesMap = new Map(localEntries.map(e => [e.id, e]));
    remoteEntries.forEach((remote: any) => {
        const local = mergedEntriesMap.get(remote.id);
        if (!local || new Date(remote.updated_at).getTime() > local.updatedAt) {
            const appEntry: TextEntry = {
                id: remote.id,
                title: remote.title,
                text: remote.text,
                createdAt: new Date(remote.created_at).getTime(),
                updatedAt: new Date(remote.updated_at).getTime(),
                readingProgress: remote.reading_progress,
                analyzedSentences: remote.analyzed_sentences,
            };
            mergedEntriesMap.set(remote.id, appEntry);
        }
    });

    const mergedDeckMap = new Map(localDeck.map(i => [i.id, i]));
    remoteDeck.forEach((remote: any) => {
        const local = mergedDeckMap.get(remote.id);
        // Deck items don't have updatedAt, so remote always wins for simplicity.
        if (!local || remote) {
             const appItem: ReviewItem = {
                id: remote.id,
                type: remote.type,
                content: remote.content,
                textEntryId: remote.text_entry_id,
                srsStage: remote.srs_stage,
                intervalModifier: remote.interval_modifier,
                incorrectAnswerCount: remote.incorrect_answer_count,
                nextReviewDate: new Date(remote.next_review_date).getTime(),
                addedAt: new Date(remote.added_at).getTime(),
            };
            mergedDeckMap.set(remote.id, appItem);
        }
    });

    const finalEntries = Array.from(mergedEntriesMap.values());
    const finalDeck = Array.from(mergedDeckMap.values());

    // 4. Write merged data back to both sources
    if (finalEntries.length > 0) {
        const entriesToUpsert = finalEntries.map(e => ({
            id: e.id,
            user_id: userId,
            title: e.title,
            text: e.text,
            reading_progress: e.readingProgress,
            analyzed_sentences: e.analyzedSentences,
            created_at: new Date(e.createdAt).toISOString(),
            updated_at: new Date(e.updatedAt).toISOString(),
        }));
        await supabase.from('text_entries').upsert(entriesToUpsert);
    }
     if (finalDeck.length > 0) {
        const deckToUpsert = finalDeck.map(i => ({
            id: i.id,
            user_id: userId,
            type: i.type,
            content: i.content,
            text_entry_id: i.textEntryId,
            srs_stage: i.srsStage,
            interval_modifier: i.intervalModifier,
            incorrect_answer_count: i.incorrectAnswerCount,
            next_review_date: new Date(i.nextReviewDate).toISOString(),
            added_at: new Date(i.addedAt).toISOString(),
        }));
        await supabase.from('review_deck').upsert(deckToUpsert);
    }

    await db.clearTextEntries();
    await db.clearReviewDeck();
    for (const entry of finalEntries) await db.addOrUpdateTextEntry(entry);
    for (const item of finalDeck) await db.addOrUpdateReviewItem(item);
    
    // 5. Update app state
    appDispatch({ type: 'INITIALIZE_DATA_SUCCESS', payload: { history: finalEntries, reviewDeck: finalDeck, currentTextEntryId: null, view: 'EDITOR' } });
}

export const AccountManager = () => {
    const { authState, user, supabase } = useAuth();
    const { dispatch: appDispatch } = useAppData();
    const { showConfirmation, showAlert } = useModal();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSignOut = async () => {
        if (!supabase) return;
        showConfirmation("Are you sure you want to sign out?", async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                showAlert(`Error signing out: ${error.message}`);
            } else {
                showAlert('You have been signed out.');
            }
        }, {confirmText: "Sign Out", confirmClass: "bg-destructive hover:bg-destructive-hover"});
    };

    const handleGoogleSignIn = async () => {
        if (!supabase) return;
        setIsSubmitting(true);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // By providing redirectTo, we ensure Supabase knows where to send the user
                // back, even after the OAuth dance in the popup.
                redirectTo: window.location.href,
                // This is crucial for iframe-based environments.
                // It prevents the browser from trying to open the OAuth page
                // in a frame, which is blocked by Google's 'X-Frame-Options'.
                skipBrowserRedirect: true,
            },
        });

        if (error) {
            showAlert(`Error preparing for Google Sign-In: ${error.message}`);
            setIsSubmitting(false);
        } else if (data.url) {
            // In a sandboxed iframe without 'allow-top-navigation',
            // we cannot set `window.top.location.href`. Instead, we open
            // the URL in a new tab/popup. Supabase handles the session
            // sync across tabs automatically.
            window.open(data.url, '_blank');
        } else {
             showAlert('An unknown error occurred while trying to sign in with Google.');
             setIsSubmitting(false);
        }
    };

    const handleSync = async (userId: string) => {
        if (!userId) return;
        setIsSyncing(true);
        try {
            await syncData(userId, appDispatch, supabase);
            showAlert("Data successfully synced with the cloud.");
        } catch (e: any) {
            showAlert(`Data sync failed: ${e.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    if (authState === 'INITIALIZING' || authState === 'NO_CONFIG' || isSyncing) {
        const message = 
            isSyncing ? 'Syncing data...'
            : authState === 'INITIALIZING' ? 'Checking auth status...'
            : 'Account management disabled.';

        return (
             <div>
                <p className="text-sm font-medium text-text-secondary mb-3">Account</p>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    {authState !== 'NO_CONFIG' && <i className="bi bi-arrow-repeat animate-spin"></i>}
                    <span>{message}</span>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Account</p>
            {authState === 'LOGGED_IN' && user ? (
                 <div className="space-y-3">
                    <p className="text-sm text-text-secondary truncate" title={user.email}>
                        Signed in as <strong className="text-text-primary font-medium">{user.email}</strong>
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => handleSync(user.id)} disabled={isSyncing} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-surface-soft text-text-secondary hover:bg-surface-hover transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-70">
                            <i className={`bi ${isSyncing ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-repeat'}`}></i>
                            Sync Data
                        </button>
                        <button onClick={handleSignOut} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-destructive-subtle-bg text-destructive-subtle-text hover:bg-destructive-subtle-bg/80 transition-colors inline-flex items-center justify-center gap-2">
                            <i className="bi bi-box-arrow-right"></i>
                            Sign Out
                        </button>
                    </div>
                 </div>
            ) : (
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="w-full text-sm font-medium px-3 py-2.5 rounded-lg bg-white text-[#3c4043] border border-gray-300 hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-3 shadow-sm disabled:opacity-70"
                >
                    <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.355-11.176-7.944l-6.573,4.817C9.656,39.663,16.318,44,24,44z"></path>
                        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,34.556,44,29.861,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                    {isSubmitting ? 'Redirecting...' : 'Sign in with Google'}
                </button>
            )}
        </div>
    );
};