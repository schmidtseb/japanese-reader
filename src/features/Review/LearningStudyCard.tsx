// src/features/Review/LearningStudyCard.tsx
import { ReviewItem } from '../../contexts/index.ts';
import { Furigana } from '../../components/Furigana.tsx';

const StudyCardContent = ({ item }: { item: ReviewItem }) => {
    if (item.type === 'word') {
        return (
            <div className="text-center">
                <div className="text-3xl font-japanese font-semibold mb-4 pb-4 border-b border-border-subtle">
                    <Furigana base={item.content.japanese_segment} reading={item.content.reading || ''} />
                </div>
                <div className="text-lg text-text-secondary mb-6">{item.content.english_equivalent}</div>
                <div className="text-sm space-y-2 text-text-muted">
                    <p><strong className="font-medium text-text-secondary">Category:</strong> {item.content.category.replace(/_/g, ' ').replace(/-/g, ', ')}</p>
                    <p><strong className="font-medium text-text-secondary">Reading:</strong> {item.content.reading}</p>
                </div>
            </div>
        );
    }
    // grammar
    const { original_sentence, constituent_text, pattern_name, explanation } = item.content;
    const highlightedSentence = (original_sentence && constituent_text)
        ? original_sentence.replace(constituent_text, `<span class="bg-accent-subtle-bg text-accent-text px-2 py-1 rounded">${constituent_text}</span>`)
        : pattern_name;

    return (
        <div className="text-center">
            { (original_sentence || constituent_text) && (
                 <div 
                    className="text-xl md:text-2xl font-japanese font-medium text-center text-text-primary p-2 leading-relaxed mb-6 pb-6 border-b border-border-subtle" 
                    dangerouslySetInnerHTML={{ __html: highlightedSentence }} 
                 />
            )}
            <div className="text-3xl font-japanese font-semibold mb-4 text-accent">{pattern_name}</div>
            <p className="text-lg text-text-secondary">{explanation}</p>
        </div>
    );
}

export const LearningStudyCard = ({ item, onExit, currentIndex, totalInChunk, onNext, onPrev, onStartQuiz }: { 
    item: ReviewItem, 
    onExit: () => void, 
    currentIndex: number, 
    totalInChunk: number, 
    onNext: () => void, 
    onPrev: () => void, 
    onStartQuiz: () => void 
}) => {
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === totalInChunk - 1;

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4">
            <div className="w-full flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-text-muted px-3 py-1 bg-surface rounded-full">{currentIndex + 1} / {totalInChunk}</span>
                <button onClick={onExit} title="Exit Review Session" className="btn-ghost">
                    <i className="bi bi-x-lg text-2xl"></i>
                </button>
            </div>
            <div className="relative w-full min-h-[20rem] flex flex-col justify-center items-center p-6 bg-surface-soft rounded-2xl shadow-lg">
                <StudyCardContent item={item} />
            </div>
            <div className="mt-8 w-full flex items-center justify-center gap-4">
                <button onClick={onPrev} disabled={isFirst} className="p-4 rounded-full bg-surface-hover text-text-secondary disabled:opacity-50 transition">
                    <i className="bi bi-arrow-left text-2xl"></i>
                </button>
                {isLast ? (
                    <button onClick={onStartQuiz} className="btn-primary text-xl px-10 py-4">
                        Start Quiz!
                    </button>
                ) : (
                    <button onClick={onNext} className="p-4 rounded-full bg-surface-hover text-text-secondary transition">
                        <i className="bi bi-arrow-right text-2xl"></i>
                    </button>
                )}
            </div>
        </div>
    );
};