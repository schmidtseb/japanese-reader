import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { screen, fireEvent, render, waitFor } from '@testing-library/react';
import { AppDataProvider, AppDataState, SettingsProvider, SettingsState, UIProvider, View, ReviewItem } from '../../contexts';
import { ModalProvider } from '../../components/Modal.tsx';
import { ReviewController } from './ReviewController';

// Mock child components that are not the focus of the test, to simplify rendering and assertions
vi.mock('./components/ReviewCard.tsx', () => ({ ReviewCard: ({item, onExit}: any) => <div><span>ReviewCard for {item.id}</span> <button onClick={onExit}>Exit</button></div> }));
vi.mock('./components/ReviewComplete.tsx', () => ({ ReviewComplete: ({onManage, onExit}: any) => <div><span>ReviewComplete</span> <button onClick={onManage}>Manage</button><button onClick={onExit}>Exit</button></div> }));
vi.mock('./components/ReviewEmpty.tsx', () => ({ ReviewEmpty: ({onManage, onExit}: any) => <div><span>ReviewEmpty</span> <button onClick={onManage}>Manage</button><button onClick={onExit}>Exit</button></div> }));
vi.mock('./components/DeckManager.tsx', () => ({ DeckManager: ({onExit}: any) => <div><span>DeckManager</span> <button onClick={onExit}>Back</button></div> }));
vi.mock('./components/LearningStudyCard.tsx', () => ({ LearningStudyCard: ({onStartQuiz}: any) => <div><span>LearningStudyCard</span> <button onClick={onStartQuiz}>Start Quiz</button></div> }));
vi.mock('./components/LearningQuizCard.tsx', () => ({ LearningQuizCard: ({quizQuestion, onAnswer}: any) => <div><span>LearningQuizCard for {quizQuestion.item.id}</span> <button onClick={() => onAnswer(quizQuestion, true)}>Remember</button></div> }));
vi.mock('./components/ChunkCompleteScreen.tsx', () => ({ ChunkCompleteScreen: ({onContinue}: any) => <div><span>ChunkCompleteScreen</span> <button onClick={onContinue}>Continue</button></div> }));
vi.mock('./components/ReviewStart.tsx', () => ({
    ReviewStart: ({ onStartLearning, onStartReviewing, newCount, reviewCount }: any) => (
    <div>
      <span>ReviewStart</span>
      {newCount > 0 && <button onClick={onStartLearning}>Learn {newCount} new items</button>}
      {reviewCount > 0 && <button onClick={onStartReviewing}>Review {reviewCount} due items</button>}
    </div>
  )
}));


const mockSettings: SettingsState = {
  isLoading: false,
  theme: 'light',
  showFurigana: true,
  showColorCoding: true,
  showPitchAccent: true,
  analysisDepth: 'medium',
  fontSizeIndex: 2,
  newWordsPerDay: 5,
  userApiKey: 'test-key',
};

const mockNewItem: ReviewItem = { id: 'new-1', srsStage: 0, nextReviewDate: 0, addedAt: 1, type: 'word', content: {japanese_segment: '新しい'}, incorrectAnswerCount: 0, intervalModifier: 1.0 };
const mockDueItem: ReviewItem = { id: 'due-1', srsStage: 1, nextReviewDate: new Date().setHours(0,0,0,0) - 1000, addedAt: 2, type: 'word', content: {japanese_segment: '復習'}, incorrectAnswerCount: 0, intervalModifier: 1.0 };
const mockFutureItem: ReviewItem = { id: 'future-1', srsStage: 2, nextReviewDate: new Date().setHours(0,0,0,0) + 86400000, addedAt: 3, type: 'word', content: {japanese_segment: '未来'}, incorrectAnswerCount: 0, intervalModifier: 1.0 };

const renderReviewController = (initialAppData: Partial<AppDataState> = {}, initialSettings: Partial<SettingsState> = {}) => {
  const dispatch = vi.fn();
  const fullInitialAppData: AppDataState = {
    isLoading: false,
    view: View.Review,
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
                    <ReviewController />
                </ModalProvider>
            </AppDataProvider>
        </UIProvider>
    </SettingsProvider>
  );

  return { dispatch };
};

describe('ReviewController', () => {

    it('renders ReviewEmpty when the deck is empty', () => {
        renderReviewController({ reviewDeck: [] });
        expect(screen.getByText('ReviewEmpty')).toBeInTheDocument();
    });

    it('renders ReviewComplete when there are no due or new items', () => {
        renderReviewController({ reviewDeck: [mockFutureItem] });
        expect(screen.getByText('ReviewComplete')).toBeInTheDocument();
    });

    it('renders ReviewStart when new items are available', async () => {
        renderReviewController({ reviewDeck: [mockNewItem] });
        expect(screen.getByText(/Learn 1 new items/i)).toBeInTheDocument();
    });
    
    it('renders ReviewStart when due items are available', async () => {
        renderReviewController({ reviewDeck: [mockDueItem] });
        expect(screen.getByText(/Review 1 due items/i)).toBeInTheDocument();
    });

    describe('Learning Flow', () => {
        it('transitions from Start to Learning phase', async () => {
            renderReviewController({ reviewDeck: [mockNewItem] });
            fireEvent.click(screen.getByRole('button', { name: /learn 1 new items/i }));
            await waitFor(() => {
                expect(screen.getByText('LearningStudyCard')).toBeInTheDocument();
            });
        });

        it('transitions from Study to Quiz phase', async () => {
            renderReviewController({ reviewDeck: [mockNewItem] });
            fireEvent.click(screen.getByRole('button', { name: /learn 1 new items/i }));
            await screen.findByText('LearningStudyCard');
            fireEvent.click(screen.getByRole('button', { name: /start quiz/i }));
            await waitFor(() => {
                expect(screen.getByText(/LearningQuizCard for new-1/i)).toBeInTheDocument();
            });
        });

        const completeLearningQuiz = async () => {
            // mockNewItem has a kanji ('新'), so it generates two quiz questions.
            // We need to answer both.
            await screen.findByText(/LearningQuizCard for new-1/i);
            const rememberButton = () => screen.getByRole('button', { name: /remember/i });
           
            // Answer first question
            fireEvent.click(rememberButton());
           
            // Answer second question (component re-renders for the next item in queue)
            // The same button will be present for the next question due to our mock.
            await waitFor(() => expect(rememberButton()).toBeInTheDocument());
            fireEvent.click(rememberButton());
       };

        it('handles a correct quiz answer and shows ChunkCompleteScreen', async () => {
            const { dispatch } = renderReviewController({ reviewDeck: [mockNewItem] });
            fireEvent.click(screen.getByRole('button', { name: /learn 1 new items/i }));
            await screen.findByText('LearningStudyCard');
            fireEvent.click(screen.getByRole('button', { name: /start quiz/i }));

            await completeLearningQuiz();

            await waitFor(() => {
                expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                    type: 'ADD_OR_UPDATE_REVIEW_ITEM',
                    payload: expect.objectContaining({ id: 'new-1', srsStage: 1 })
                }));
                expect(screen.getByText('ChunkCompleteScreen')).toBeInTheDocument();
            });
        });

         it('transitions to Review phase after learning is done', async () => {
            renderReviewController({ reviewDeck: [mockNewItem, mockDueItem] });
            fireEvent.click(screen.getByRole('button', { name: /learn 1 new items/i })); // Start -> Learning
            await screen.findByText('LearningStudyCard');
            fireEvent.click(screen.getByRole('button', { name: /start quiz/i })); // Study -> Quiz
            
            await completeLearningQuiz();
            
            await screen.findByText('ChunkCompleteScreen');
            fireEvent.click(screen.getByRole('button', { name: /continue/i })); // ChunkComplete -> Review
            
            await waitFor(() => {
                expect(screen.getByText(/ReviewCard for due-1/i)).toBeInTheDocument();
            });
        });
    });

    describe('Review Flow', () => {
        it('transitions from Start to Review phase when only due items exist', async () => {
            renderReviewController({ reviewDeck: [mockDueItem] });
            fireEvent.click(screen.getByRole('button', { name: /review 1 due items/i }));
            await waitFor(() => {
                expect(screen.getByText(/ReviewCard for due-1/i)).toBeInTheDocument();
            });
        });
    });
    
    describe('Manage Flow', () => {
        it('switches to DeckManager from ReviewEmpty', async () => {
            renderReviewController({ reviewDeck: [] });
            await screen.findByText('ReviewEmpty');
            fireEvent.click(screen.getByRole('button', { name: /manage/i }));
            await waitFor(() => {
                expect(screen.getByText('DeckManager')).toBeInTheDocument();
            });
        });

        it('returns from DeckManager to the appropriate screen', async () => {
            renderReviewController({ reviewDeck: [] });
            await screen.findByText('ReviewEmpty');
            fireEvent.click(screen.getByRole('button', { name: /manage/i }));
            await screen.findByText('DeckManager');
            fireEvent.click(screen.getByRole('button', { name: /back/i }));
            await waitFor(() => {
                // Since the deck is still empty, it should return to the empty screen
                expect(screen.getByText('ReviewEmpty')).toBeInTheDocument();
            });
        });
    });
});