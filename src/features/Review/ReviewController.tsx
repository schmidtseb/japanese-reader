

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

export type WordQuizType = 'jp-en' | 'kanji-read';

const ReviewController = () => {
    const { state, dispatch } = useAppData();
    const { state: settingsState } = useSettings();
    const { showConfirmation } = useModal();
    const [cardKey, setCardKey] = useState(0);

    const [mode, setMode] = useState<'LOADING' | 'START' | 'LEARNING' | 'REVIEW' | 'COMPLETE' | 'EMPTY' | 'MANAGE'>('LOADING');
    const [learningPhase, setLearningPhase] = useState<'STUDY' | 'QUIZ' | 'CHUNK_COMPLETE'>('STUDY');
    
    const [sessionQueues, setSessionQueues] = useState<{ newItemsForSession: ReviewItem[], allDueReviewItems: ReviewItem[] }>({ newItemsForSession: [], allDueReviewItems: [] });
    const [learningChunks, setLearningChunks] = useState<ReviewItem[][]>([]);
    
    // State for the active review session
    const [reviewSubQueue, setReviewSubQueue] = useState<Array<{ item: ReviewItem, quizType?: WordQuizType }>>([]);
    const [penalizedInSession, setPenalizedInSession] = useState<Set<string>>(new Set());

    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [studyIndex, setStudyIndex] = useState(0);
    const [quizQueue, setQuizQueue] = useState<Array<{ item: ReviewItem, quizType?: WordQuizType }>>([]);
    
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
        if (mode === 'LOADING' || (mode !== 'LEARNING' && mode !== 'REVIEW' && mode !== 'MANAGE')) {
            setCurrentChunkIndex(0);
            setStudyIndex(0);
            setQuizQueue([]);
            setReviewSubQueue([]);
            setCardKey(0); // Reset key on mode change
            setSessionStats({ learned: 0, reviewed: 0 });
            setLearningPhase('STUDY');

            reevaluateMode();
        }
    }, [mode, reevaluateMode]);
    
    useEffect(() => {
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
            const reviewItemsWithQuizType = sessionQueues.allDueReviewItems.map(item => {
                let quizType: WordQuizType | undefined = undefined;
                if (item.type === 'word') {
                    const types: WordQuizType[] = ['jp-en'];
                    if (/[一-龯]/.test(item.content.japanese_segment)) {
                        types.push('kanji-read');
                    }
                    quizType = types[Math.floor(Math.random() * types.length)];
                }
                return { item, quizType };
            });
            setReviewSubQueue(reviewItemsWithQuizType);
            setMode('REVIEW');
        } else {
            reevaluateMode();
        }
    };

    const startQuizForChunk = () => {
        const currentChunk = learningChunks[currentChunkIndex];
        if (currentChunk) {
            const newQuizQueue: Array<{ item: ReviewItem, quizType?: WordQuizType }> = [];
            currentChunk.forEach(item => {
                if (item.type === 'word') {
                    newQuizQueue.push({ item, quizType: 'jp-en' });
                    if (/[一-龯]/.test(item.content.japanese_segment)) {
                        newQuizQueue.push({ item, quizType: 'kanji-read' });
                    }
                } else if (item.type === 'grammar') {
                    newQuizQueue.push({ item });
                }
            });
            setQuizQueue(newQuizQueue.sort(() => 0.5 - Math.random()));
            setLearningPhase('QUIZ');
        }
    };

    const handleQuizAnswer = (quizQuestion: { item: ReviewItem; quizType?: WordQuizType }, remembered: boolean) => {
        const newQueue = [...quizQueue];
        const itemJustAnswered = newQueue.shift(); // Take the current item off the front

        if (!remembered) {
            newQueue.push(itemJustAnswered!); // Put it on the back if forgotten
        }
        
        if (newQueue.length === 0) {
            const currentChunk = learningChunks[currentChunkIndex];
            currentChunk.forEach(item => {
                const updatedItem = calculateNextReview(item, 3); // "Good"
                dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: updatedItem });
            });
            setSessionStats(prev => ({ ...prev, learned: prev.learned + currentChunk.length }));
            setLearningPhase('CHUNK_COMPLETE');
        } else {
            setQuizQueue(newQueue);
        }
        
        // This must be called for every answer to ensure the card component resets its internal state.
        setCardKey(k => k + 1);
    };

    const advanceAfterChunk = () => {
        if (currentChunkIndex < learningChunks.length - 1) {
            setCurrentChunkIndex(prev => prev + 1);
            setStudyIndex(0);
            setLearningPhase('STUDY');
        } else {
            if (sessionQueues.allDueReviewItems.length > 0) {
                handleStartReviewing();
            } else {
                reevaluateMode();
            }
        }
    };
    
    const handleReviewAnswer = (isCorrectOrQuality: boolean | ReviewQuality) => {
        const currentQueueItem = reviewSubQueue[0];
        if (!currentQueueItem) return;

        const { item } = currentQueueItem;
        let quality: ReviewQuality;

        if (typeof isCorrectOrQuality === 'boolean') {
            quality = isCorrectOrQuality ? 3 : 1; // Correct -> Good, Incorrect -> Again
        } else {
            quality = isCorrectOrQuality; // For grammar cards
        }

        if (quality === 1) { // "Again" -> Incorrect
            // Mark as penalized for this session.
            setPenalizedInSession(prev => new Set(prev).add(item.id));
            
            // Move item to the back of the queue for another try in this session.
            // The database is NOT updated. The item remains "due" until a correct answer is given.
            setReviewSubQueue(prevQueue => {
                const rest = prevQueue.slice(1);
                return [...rest, currentQueueItem];
            });
        } else { // Correct answer (quality > 1)
            // A correct answer updates the DB with the new SRS stage and review date.
            const updatedItem = calculateNextReview(item, quality);
            dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: updatedItem });
            
            setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
            
            // Remove item from the front of the queue as it's been successfully reviewed.
            setReviewSubQueue(prevQueue => prevQueue.slice(1));
        }
        
        // This must be called for every answer to ensure the card component resets its internal state.
        setCardKey(k => k + 1);
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
                        quizQuestion={currentQuizItem}
                        onExit={handleExit}
                        onAnswer={handleQuizAnswer}
                        remainingCount={quizQueue.length}
                        cardKey={cardKey}
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
            const currentQueueItem = reviewSubQueue[0];
            if (!currentQueueItem) {
                return <div className="p-6 text-center text-text-muted">Loading next review...</div>;
            }
            return <ReviewCard 
                item={currentQueueItem.item}
                quizType={currentQueueItem.quizType}
                onReview={handleReviewAnswer}
                onExit={handleExit}
                cardKey={cardKey}
            />;
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

export default ReviewController;