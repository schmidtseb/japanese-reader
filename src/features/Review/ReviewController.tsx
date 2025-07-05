import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppData, ReviewItem, ReviewQuality, View, useSettings } from '../../contexts/index.ts';
import { calculateNextReview } from '../../services/srs.ts';
import { useModal } from '../../components/Modal.tsx';
import { ReviewCard } from './components/ReviewCard.tsx';
import { ReviewComplete } from './components/ReviewComplete.tsx';
import { ReviewEmpty } from './components/ReviewEmpty.tsx';
import { DeckManager } from './components/DeckManager.tsx';
import { LearningStudyCard } from './components/LearningStudyCard.tsx';
import { LearningQuizCard } from './components/LearningQuizCard.tsx';
import { ChunkCompleteScreen } from './components/ChunkCompleteScreen.tsx';
import { ReviewStart } from './components/ReviewStart.tsx';

const CHUNK_SIZE = 5;

export const ReviewController = () => {
    const { state, dispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { showConfirmation } = useModal();

    const [mode, setMode] = useState<'LOADING' | 'START' | 'LEARNING' | 'REVIEW' | 'COMPLETE' | 'EMPTY' | 'MANAGE'>('LOADING');
    const [learningPhase, setLearningPhase] = useState<'STUDY' | 'QUIZ' | 'CHUNK_COMPLETE'>('STUDY');
    
    const [sessionQueues, setSessionQueues] = useState<{ newItemsForSession: ReviewItem[], allDueReviewItems: ReviewItem[] }>({ newItemsForSession: [], allDueReviewItems: [] });
    const [learningChunks, setLearningChunks] = useState<ReviewItem[][]>([]);
    
    // State for the active review session
    const [reviewSubQueue, setReviewSubQueue] = useState<ReviewItem[]>([]);
    const [penalizedInSession, setPenalizedInSession] = useState<Set<string>>(new Set());

    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [studyIndex, setStudyIndex] = useState(0);
    const [quizQueue, setQuizQueue] = useState<ReviewItem[]>([]);
    
    const [sessionStats, setSessionStats] = useState({ learned: 0, reviewed: 0 });

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
        const nowTimestamp = Date.now();

        const deckForContext = state.reviewDeck.filter(item => {
             if (!state.currentTextEntryId) return true;
             return item.textEntryId === state.currentTextEntryId || !item.textEntryId;
        });

        const allNewItems = deckForContext
            .filter(item => item.srsStage === 0)
            .sort((a, b) => a.addedAt - b.addedAt);
            
        const allDueReviewItems = deckForContext
            .filter(item => item.srsStage > 0 && item.nextReviewDate <= nowTimestamp)
            .sort((a, b) => a.nextReviewDate - b.nextReviewDate);

        const newItemsForSession = allNewItems.slice(0, settingsState.newWordsPerDay);
        setSessionQueues({ newItemsForSession, allDueReviewItems });

        const chunks: ReviewItem[][] = [];
        for (let i = 0; i < newItemsForSession.length; i += CHUNK_SIZE) {
            chunks.push(newItemsForSession.slice(i, i + CHUNK_SIZE));
        }
        setLearningChunks(chunks);

        if (deckForContext.length === 0) {
            setMode('EMPTY');
        } else if (newItemsForSession.length === 0 && allDueReviewItems.length === 0) {
            setMode('COMPLETE');
        } else {
            setMode('START');
        }
    }, [state.reviewDeck, state.currentTextEntryId, settingsState.newWordsPerDay]);
    
    useEffect(() => {
        // This effect runs once on mount or when re-evaluating the entire session state.
        if (mode === 'LOADING' || (mode !== 'LEARNING' && mode !== 'REVIEW' && mode !== 'MANAGE')) {
            // Reset all session progress
            setCurrentChunkIndex(0);
            setStudyIndex(0);
            setQuizQueue([]);
            setReviewSubQueue([]);
            setSessionStats({ learned: 0, reviewed: 0 });
            setLearningPhase('STUDY');

            reevaluateMode();
        }
    }, [mode, reevaluateMode]);
    
    useEffect(() => {
        // This effect handles the end of a review sub-session.
        if (mode === 'REVIEW' && reviewSubQueue.length === 0 && sessionStats.reviewed > 0) {
             reevaluateMode();
        }
    }, [reviewSubQueue, mode, sessionStats.reviewed, reevaluateMode]);

    const handleExit = () => {
        if (state.currentTextEntryId) {
            dispatch({ type: 'SET_VIEW', payload: View.Reader });
        } else {
            dispatch({ type: 'RESET_VIEW' });
        }
    };
    
    const handleStartLearning = () => {
        if (learningChunks.length > 0) {
            setMode('LEARNING');
        } else {
            reevaluateMode();
        }
    };

    const handleStartReviewing = () => {
        if (sessionQueues.allDueReviewItems.length > 0) {
            setPenalizedInSession(new Set());
            setReviewSubQueue([...sessionQueues.allDueReviewItems]);
            setMode('REVIEW');
        } else {
            reevaluateMode();
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
            const updatedItem = calculateNextReview(item, 3); // "Good"
            dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: updatedItem });
            setSessionStats(prev => ({ ...prev, learned: prev.learned + 1 }));
            newQueue = newQueue.filter(i => i.id !== item.id);
        } else {
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
        // If there are more chunks of new items to learn
        if (currentChunkIndex < learningChunks.length - 1) {
            setCurrentChunkIndex(prev => prev + 1);
            setStudyIndex(0);
            setLearningPhase('STUDY');
        } else {
            // All learning chunks for this session are done.
            // Now, check if there are any due reviews waiting.
            // We use the initially calculated queue. This is safe because an item cannot be
            // both new (srsStage=0) and due (srsStage>0) at the same time.
            if (sessionQueues.allDueReviewItems.length > 0) {
                handleStartReviewing(); // This will switch mode to 'REVIEW'
            } else {
                // No more learning, no reviews. The session is over.
                // Re-evaluate will take us to the 'COMPLETE' screen.
                reevaluateMode();
            }
        }
    };
    
    const handleReviewAction = (quality: ReviewQuality) => {
        const currentItem = reviewSubQueue[0];
        if (!currentItem) return;

        if (quality === 1) { // "Again"
            // Only calculate SRS penalty on the first "Again" in a session.
            if (!penalizedInSession.has(currentItem.id)) {
                const updatedItem = calculateNextReview(currentItem, quality);
                dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: updatedItem });
                setPenalizedInSession(prev => new Set(prev).add(currentItem.id));
            }
            // Always move the item to the back of the queue to be reviewed again.
            setReviewSubQueue(prevQueue => {
                const rest = prevQueue.slice(1);
                return [...rest, currentItem];
            });
        } else { // Correct answer (Hard, Good, Easy)
            // If the item was penalized in this session, don't upgrade its SRS stage.
            // Just remove it from the queue for this session, as the user has now "re-learned" it.
            if (penalizedInSession.has(currentItem.id)) {
                setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
                setReviewSubQueue(prevQueue => prevQueue.slice(1));
            } else {
                // This is a normal correct answer for an item not previously failed in this session.
                const updatedItem = calculateNextReview(currentItem, quality);
                dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: updatedItem });
                setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
                setReviewSubQueue(prevQueue => prevQueue.slice(1));
            }
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
            return <ReviewStart 
                newCount={sessionQueues.newItemsForSession.length} 
                reviewCount={sessionQueues.allDueReviewItems.length} 
                onStartLearning={handleStartLearning}
                onStartReviewing={handleStartReviewing}
                onExit={handleExit}
            />;
        
        case 'LEARNING': {
            const currentChunk = learningChunks[currentChunkIndex];
            if (!currentChunk) {
                reevaluateMode();
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
                    if (!currentQuizItem) return null;
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
                        hasReviews={sessionQueues.allDueReviewItems.length > 0}
                    />;
            }
        }

        case 'REVIEW': {
            const currentItem = reviewSubQueue[0];
            if (!currentItem) {
                return <div className="p-6 text-center text-text-muted">Loading next review...</div>;
            }
            return <ReviewCard item={currentItem} onReview={handleReviewAction} onExit={handleExit} />;
        }
            
        case 'COMPLETE': {
            const hasMoreItemsForNextSession = sessionQueues.newItemsForSession.length > 0 || sessionQueues.allDueReviewItems.length > 0;
            return <ReviewComplete 
                learnedCount={sessionStats.learned} 
                reviewedCount={sessionStats.reviewed} 
                onManage={() => setMode('MANAGE')} 
                onExit={handleExit} 
                nextReviewTimestamp={nextReviewTimestamp}
                hasMoreItems={hasMoreItemsForNextSession}
                onRestart={reevaluateMode}
            />;
        }
        
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