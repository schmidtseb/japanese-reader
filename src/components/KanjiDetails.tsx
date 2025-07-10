// src/components/KanjiDetails.tsx
import React, { useEffect } from 'react';
import { useGetKanjiDetails } from '../services/gemini.ts';
import { ErrorComponent } from './ErrorComponent.tsx';
import { Furigana } from './Furigana.tsx';
import { useUI } from '../contexts/index.ts';

export const KanjiDetails = ({ kanji }: { kanji: string }) => {
    const { data, isLoading, error, execute } = useGetKanjiDetails();
    const { dispatch: uiDispatch, state: uiState } = useUI();

    useEffect(() => {
        execute(kanji);
    }, [kanji, execute]);

    useEffect(() => {
        // Update the bottom sheet title when data arrives, but only if the sheet is still visible
        if (uiState.bottomSheet.visible) {
            if (data) {
                uiDispatch({ type: 'SET_BOTTOM_SHEET_TITLE', payload: `Details for ${data.kanji}`});
            } else if (!isLoading) { // Don't set title while loading
                 uiDispatch({ type: 'SET_BOTTOM_SHEET_TITLE', payload: `Details for ${kanji}`});
            }
        }
    }, [data, kanji, isLoading, uiDispatch, uiState.bottomSheet.visible]);
    
    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center p-8 min-h-[200px]">
                <i className="bi bi-arrow-repeat text-3xl text-text-muted animate-spin"></i>
            </div>
        );
    }

    if (error) {
        return <ErrorComponent error={error} onRetry={() => execute(kanji)} />;
    }

    if (!data) {
        return <div className="p-4 text-center text-text-muted">No details found.</div>;
    }

    return (
        <div className="p-2 space-y-6">
            <div className="text-center pb-4 border-b border-border-subtle">
                <h3 className="text-6xl font-japanese font-bold text-primary">{data.kanji}</h3>
                <p className="text-xl text-text-secondary mt-2">{data.meaning}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center text-sm">
                <div>
                    <div className="font-semibold text-text-muted uppercase text-xs tracking-wider">On'yomi</div>
                    <div className="text-lg font-japanese mt-1">{data.onyomi || '–'}</div>
                </div>
                <div>
                    <div className="font-semibold text-text-muted uppercase text-xs tracking-wider">Kun'yomi</div>
                    <div className="text-lg font-japanese mt-1">{data.kunyomi || '–'}</div>
                </div>
                 <div>
                    <div className="font-semibold text-text-muted uppercase text-xs tracking-wider">JLPT</div>
                    <div className="text-lg font-semibold mt-1">{data.jlpt_level}</div>
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-text-secondary mb-3 text-sm">Example Words</h4>
                <ul className="space-y-4">
                    {data.example_words.map((ex: any, i: number) => (
                         <li key={i} className="flex flex-col">
                            <a 
                                href={`https://jisho.org/search/${encodeURIComponent(ex.word)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-jp text-text-primary hover:text-accent transition"
                                onClick={e => e.stopPropagation()}
                            >
                                <Furigana base={ex.word} reading={ex.reading} />
                            </a>
                            <span className="text-sm text-text-muted -mt-1">{ex.meaning}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};