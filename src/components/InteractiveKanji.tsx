// ui/components/InteractiveKanji.tsx
import React, { useMemo } from 'react';
import { useUI } from '../contexts/index.ts';
import { KanjiDetails } from './KanjiDetails.tsx';

export const InteractiveKanji = React.memo(function InteractiveKanji({ text }: { text: string }) {
    const { state: uiState, dispatch: uiDispatch } = useUI();

    const handleClick = (event: React.MouseEvent, kanji: string) => {
        event.stopPropagation();
        const target = event.currentTarget as HTMLElement;

        const content = <KanjiDetails kanji={kanji} />;
        const title = `Details for ${kanji}`;

        if (window.innerWidth < 768) { // BottomSheet
            if (uiState.bottomSheet.visible && uiState.bottomSheet.targetElement === target) {
                uiDispatch({ type: 'HIDE_BOTTOM_SHEET' });
            } else {
                uiDispatch({ type: 'SHOW_BOTTOM_SHEET', payload: { content: { title, body: content }, targetElement: target } });
            }
        } else { // Tooltip
             const rect = target.getBoundingClientRect();
             const pos = { top: rect.bottom + 10, left: rect.left + rect.width / 2 };
             // For Kanji, we always PIN, as it's an explicit click action.
             uiDispatch({ type: 'PIN_TOOLTIP', payload: { content, position: pos, targetElement: target } });
        }
    };

    const parts = useMemo(() => text.split('').map((char, index) => {
        if (/[一-龯]/.test(char)) {
            return (
                <button
                    key={index}
                    onClick={(e) => handleClick(e, char)}
                    className="underline decoration-text-muted/50 decoration-1 underline-offset-2 hover:text-accent hover:decoration-accent transition"
                >
                    {char}
                </button>
            );
        }
        return <span key={index}>{char}</span>;
    }), [text]);

    return <>{parts}</>;
});