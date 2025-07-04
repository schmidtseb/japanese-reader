// ui/components/DeckManager.tsx
import React from 'react';
import { ReviewItem } from '../contexts/index.ts';
import { Furigana } from './Furigana.tsx';
import { PitchAccentVisualizer } from './PitchAccentVisualizer.tsx';

const DeckManagerItem = ({ item, onDelete }: { item: ReviewItem, onDelete: (id: string) => void }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    
    let contentPreview, detailsHTML;
    if (item.type === 'word') {
        const { japanese_segment, english_equivalent, reading, category, pitch_accent } = item.content;
        contentPreview = <><strong className="font-japanese text-lg">{japanese_segment}</strong> <span className="text-text-muted">- {english_equivalent}</span></>;
        detailsHTML = (
            <div className="space-y-4">
                <div className="relative inline-block text-xl font-japanese font-semibold p-2 bg-surface-subtle rounded-lg" style={{ paddingTop: '22px' }}>
                    <PitchAccentVisualizer reading={reading} pitchAccent={pitch_accent} />
                    <Furigana base={japanese_segment} reading={reading} interactiveKanji />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm mt-2">
                    <div>
                        <strong className="font-medium text-text-secondary block">Meaning</strong>
                        <p className="text-text-primary">{english_equivalent}</p>
                    </div>
                    <div>
                        <strong className="font-medium text-text-secondary block">Category</strong>
                        <p className="text-text-primary capitalize">{category.replace(/_/g, ' ').toLowerCase()}</p>
                    </div>
                    <div className="sm:col-span-2">
                        <strong className="font-medium text-text-secondary block">Reading</strong>
                        <p className="text-text-primary font-japanese">{reading}</p>
                    </div>
                </div>
            </div>
        );
    } else { // grammar
        const { pattern_name, constituent_text, explanation } = item.content;
        if (constituent_text) {
             contentPreview = <><strong className="font-japanese text-lg">{constituent_text}</strong> <span className="text-text-muted">- {pattern_name}</span></>;
        } else {
             contentPreview = <strong className="font-japanese text-lg">{pattern_name}</strong>;
        }
        detailsHTML = <p className="text-sm text-text-secondary">{explanation}</p>;
    }

    return (
        <li className="deck-item bg-surface-soft rounded-lg shadow-sm transition-shadow hover:shadow-md">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex-grow pr-2">{contentPreview}</div>
                <div className="flex items-center flex-shrink-0 ml-4">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} title="Delete Item" className="btn-ghost p-2 text-destructive/70 hover:bg-destructive-subtle-bg hover:text-destructive">
                        <i className="bi bi-trash3 text-xl"></i>
                    </button>
                    <i className={`bi bi-chevron-down text-xl text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                </div>
            </div>
            {isExpanded && <div className="p-4 border-t border-border-subtle bg-surface">{detailsHTML}</div>}
        </li>
    );
};

export const DeckManager = ({ items, onDelete, onExit, title }: { items: ReviewItem[], onDelete: (id: string) => void, onExit: () => void, title: string }) => (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-text-primary truncate pr-4" title={title}>{title} ({items.length} items)</h2>
            <button onClick={onExit} title="Back to Analyzer" className="btn-secondary flex-shrink-0">Back</button>
        </div>
        {items.length === 0 ? (
            <p className="text-center text-text-muted p-8">Your deck is empty.</p>
        ) : (
            <ul className="space-y-3">
                {items.map(item => <DeckManagerItem key={item.id} item={item} onDelete={onDelete} />)}
            </ul>
        )}
    </div>
);