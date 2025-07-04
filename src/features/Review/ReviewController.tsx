import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppData, ReviewItem, ReviewQuality, View, useSettings } from '../../contexts/index.ts';
import { calculateNextReview } from '../../services/srs.ts';
import { useModal } from '../../components/Modal.tsx';
import { ReviewCard } from '../../components/ReviewCard.tsx';
import { ReviewComplete } from '../../components/ReviewComplete.tsx';
import { ReviewEmpty } from '../../components/ReviewEmpty.tsx';
import { DeckManager } from '../../components/DeckManager.tsx';
import { LearningStudyCard } from './LearningStudyCard.tsx';
import { LearningQuizCard } from './LearningQuizCard.tsx';
import { ChunkCompleteScreen } from './ChunkCompleteScreen.tsx';

const CHUNK_SIZE = 5;

const ReviewStart = ({ newCount, reviewCount, onStart }: { newCount: number, reviewCount: number, onStart: () => void }) => (
    <div className="text-center py-16 px-6 max-w-lg mx-auto flex flex-col h-full justify-center">
        <i className="bi bi-play-circle text-6xl text-accent mx-auto mb-6" aria-hidden="true"></i>
        <h2 className="text-2xl font-bold text-text-primary">Ready for your session?</h2>
        <div className="mt-4 text-lg space-y-2 text-text-secondary">
            <p>Today's plan:</p>
            <p><strong className="font-bold text-primary">{newCount}</strong> new items to learn</p>
            <p><strong className="font-bold text-accent">{reviewCount}</strong> items to review</p>
        </div>
        <div className="mt-8">
            <button onClick={onStart} className="btn-primary text-xl px-10 py-4">
                Start Session
            </button>
        </div>
    </div>
);

export const ReviewController = () => {
    const { state, dispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { showConfirmation } = useModal();

    const [mode, setMode] = useState<'LOADING' | 'START' | 'LEARNING' | 'REVIEW' | 'COMPLETE' | 'EMPTY' | 'MANAGE'>('LOADING');
    const [learningPhase, setLearningPhase] = useState<'STUDY' | 'QUIZ' | 'CHUNK_COMPLETE'>('STUDY');
    
    const [learningChunks, setLearningChunks] = useState<ReviewItem[][]>([]);
    const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
    
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [studyIndex, setStudyIndex] = useState(0);
    const [quizQueue, setQuizQueue] = useState<ReviewItem[]>([]);
    
    const [sessionStats, setSessionStats] = useState({ learned: 0, reviewed: 0 });
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

    const sessionQueues = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Filter the entire deck based on the current text context first.
        const deckForSession = state.reviewDeck.filter(item => {
            if (!state.currentTextEntryId) {
                return true; // Global context, include all items.
            }
            // Contextual view: include items for this text OR old global items.
            return item.textEntryId === state.currentTextEntryId || !item.textEntryId;
        });

        const allNewItems = deckForSession
            .filter(item => item.srsStage === 0)
            .sort((a, b) => a.addedAt - b.addedAt);
            
        const allDueReviewItems = deckForSession
            .filter(item => item.srsStage > 0 && item.nextReviewDate <= now.getTime())
            .sort((a, b) => a.nextReviewDate - b.nextReviewDate);

        return { 
            newItemsForSession: allNewItems.slice(0, settingsState.newWordsPerDay), 
            allDueReviewItems 
        };
    }, [state.reviewDeck, state.currentTextEntryId, settingsState.newWordsPerDay]);
    
    const nextReviewTimestamp = useMemo(() => {
        const deckForSession = state.reviewDeck.filter(item => {
            if (!state.currentTextEntryId) return true;
            return item.textEntryId === state.currentTextEntryId || !item.textEntryId;
        });
    
        const futureItems = deckForSession.filter(item => 
            item.srsStage > 0 && item.srsStage < 9
        );
        
        if (futureItems.length === 0) {
            return null;
        }
    
        const futureTimestamps = futureItems.map(item => item.nextReviewDate);
        return Math.min(...futureTimestamps);
    }, [state.reviewDeck, state.currentTextEntryId]);

    const reevaluateMode = useCallback(() => {
        const deckForContext = state.reviewDeck.filter(item => {
             if (!state.currentTextEntryId) return true;
             return item.textEntryId === state.currentTextEntryId || !item.textEntryId;
        });

        if (deckForContext.length === 0) {
            setMode('EMPTY');
        } else if (sessionQueues.newItemsForSession.length === 0 && sessionQueues.allDueReviewItems.length === 0) {
            setMode('COMPLETE');
        } else {
            setMode('START');
        }
    }, [state.reviewDeck, state.currentTextEntryId, sessionQueues]);

    useEffect(() => {
        if (mode === 'LOADING' || (mode !== 'LEARNING' && mode !== 'REVIEW' && mode !== 'MANAGE')) {
            const { newItemsForSession, allDueReviewItems } = sessionQueues;
            const chunks: ReviewItem[][] = [];
            for (let i = 0; i < newItemsForSession.length; i += CHUNK_SIZE) {
                chunks.push(newItemsForSession.slice(i, i + CHUNK_SIZE));
            }
            setLearningChunks(chunks);
            setReviewQueue(allDueReviewItems);

            // Reset all session progress
            setCurrentChunkIndex(0);
            setStudyIndex(0);
            setQuizQueue([]);
            setCurrentReviewIndex(0);
            setSessionStats({ learned: 0, reviewed: 0 });
            setLearningPhase('STUDY');

            reevaluateMode();
        }
    }, [sessionQueues, mode, reevaluateMode]);

    const handleExit = () => {
        if (state.currentTextEntryId) {
            dispatch({ type: 'SET_VIEW', payload: View.Reader });
        } else {
            dispatch({ type: 'RESET_VIEW' });
        }
    };
    
    const startSession = () => {
        if (learningChunks.length > 0) {
            setMode('LEARNING');
        } else if (reviewQueue.length > 0) {
            setMode('REVIEW');
        } else {
            setMode('COMPLETE');
        }
    };

    const startQuizForChunk = () => {
        const currentChunk = learningChunks[currentChunkIndex];
        if (currentChunk) {
            setQuizQueue([...currentChunk].sort(() => 0.5 - Math.random()));
            setLearningPhase('QUIZ');
        }
    };

    const handleQuizAnswer = (item: ReviewItem, remembered: boolean) => {
        let newQueue = [...quizQueue];
        if (remembered) {
            // A remembered item in the learning quiz is graded as "Good"
            const updatedItem = calculateNextReview(item, 3);
            dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: updatedItem });
            setSessionStats(prev => ({ ...prev, learned: prev.learned + 1 }));
            newQueue = newQueue.filter(i => i.id !== item.id);
        } else {
            // If forgotten, put it back at the end of the quiz queue
            newQueue = newQueue.filter(i => i.id !== item.id);
            newQueue.push(item); 
        }
        
        if (newQueue.length === 0) {
            setLearningPhase('CHUNK_COMPLETE');
        } else {
            setQuizQueue(newQueue);
        }
    };

    const advanceAfterChunk = () => {
        if (currentChunkIndex < learningChunks.length - 1) {
            setCurrentChunkIndex(prev => prev + 1);
            setStudyIndex(0);
            setLearningPhase('STUDY');
        } else {
            // Finished all learning chunks
            if (reviewQueue.length > 0) {
                setMode('REVIEW');
            } else {
                setMode('COMPLETE');
            }
        }
    };
    
    const handleReviewAction = (quality: ReviewQuality) => {
        const currentItem = reviewQueue[currentReviewIndex];
        if (!currentItem) return;

        const updatedItem = calculateNextReview(currentItem, quality);
        dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: updatedItem });
        setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));

        if (currentReviewIndex + 1 < reviewQueue.length) {
            setCurrentReviewIndex(prev => prev + 1);
        } else {
            setMode('COMPLETE');
        }
    };
    
    const handleDeleteItem = (itemId: string) => {
        showConfirmation('Are you sure you want to delete this item?', () => {
            dispatch({type: 'REMOVE_REVIEW_ITEM', payload: itemId});
        }, { confirmText: 'Delete' });
    };
    
    const currentEntryForTitle = useMemo(() => state.history.find(e => e.id === state.currentTextEntryId), [state.history, state.currentTextEntryId]);

    switch (mode) {
        case 'LOADING':
            return <div className="p-6 text-center text-text-muted">Loading review session...</div>;
        
        case 'START':
            return <ReviewStart newCount={sessionQueues.newItemsForSession.length} reviewCount={sessionQueues.allDueReviewItems.length} onStart={startSession} />;
        
        case 'LEARNING': {
            const currentChunk = learningChunks[currentChunkIndex];
            if (!currentChunk) {
                // Should not happen, but as a fallback, go to reviews or complete
                if(reviewQueue.length > 0) setMode('REVIEW');
                else setMode('COMPLETE');
                return null;
            }
            
            switch (learningPhase) {
                case 'STUDY':
                    return <LearningStudyCard 
                        item={currentChunk[studyIndex]}
                        onExit={handleExit}
                        currentIndex={studyIndex}
                        totalInChunk={currentChunk.length}
                        onNext={() => setStudyIndex(i => i + 1)}
                        onPrev={() => setStudyIndex(i => i - 1)}
                        onStartQuiz={startQuizForChunk}
                    />
                case 'QUIZ': {
                    const currentQuizItem = quizQueue[0];
                    if (!currentQuizItem) return null; // Should transition to next phase
                    return <LearningQuizCard
                        item={currentQuizItem}
                        onExit={handleExit}
                        onAnswer={handleQuizAnswer}
                        remainingCount={quizQueue.length}
                    />;
                }
                case 'CHUNK_COMPLETE':
                    return <ChunkCompleteScreen
                        onContinue={advanceAfterChunk}
                        onExit={handleExit}
                        hasMoreChunks={currentChunkIndex < learningChunks.length - 1}
                        hasReviews={reviewQueue.length > 0}
                    />;
            }
        }

        case 'REVIEW': {
            const currentItem = reviewQueue[currentReviewIndex];
            if (!currentItem) {
                setMode('COMPLETE');
                return null;
            }
            return <ReviewCard item={currentItem} onReview={handleReviewAction} onExit={handleExit} />;
        }
            
        case 'COMPLETE':
            return <ReviewComplete 
                learnedCount={sessionStats.learned} 
                reviewedCount={sessionStats.reviewed} 
                onManage={() => setMode('MANAGE')} 
                onExit={handleExit} 
                nextReviewTimestamp={nextReviewTimestamp}
            />;
        
        case 'EMPTY':
            return <ReviewEmpty onManage={() => setMode('MANAGE')} onExit={handleExit} />;
        
        case 'MANAGE': {
            const deckForManager = state.reviewDeck.filter(item => {
                if (!state.currentTextEntryId) {
                    return true;
                }
                return item.textEntryId === state.currentTextEntryId || !item.textEntryId;
            });

            const managerTitle = state.currentTextEntryId && currentEntryForTitle
                ? `Deck for "${currentEntryForTitle.title}"`
                : 'Full Review Deck';

            return (
                <div className="flex-grow min-h-0 overflow-y-auto no-scrollbar">
                    <DeckManager items={deckForManager} onDelete={handleDeleteItem} onExit={reevaluateMode} title={managerTitle} />
                </div>
            );
        }
        
        default:
            return <div className="p-6 text-center text-text-muted">An unexpected error occurred.</div>;
    }
};