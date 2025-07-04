// ui/components/Furigana.tsx
import React, { useMemo } from 'react';
import { useSettings } from '../contexts/index.ts';
import { InteractiveKanji } from './InteractiveKanji.tsx';

export const Furigana = React.memo(function Furigana({ base, reading, interactiveKanji = false }: { base: string, reading?: string, interactiveKanji?: boolean }) {
    const { state } = useSettings();
    const { showFurigana } = state;

    const content = useMemo(() => {
        if (!showFurigana || !reading || base === reading) {
            return interactiveKanji ? <InteractiveKanji text={base} /> : base;
        }

        // Okurigana-aware furigana parsing logic
        // This is a simplified algorithm and might have edge cases.
        const result: React.ReactNode[] = [];
        let rPos = 0; // position in reading string
        let bPos = 0; // position in base string

        while(bPos < base.length) {
            const bChar = base[bPos];

            if (/[一-龯]/.test(bChar)) { // It's a kanji
                let kanjiBlock = bChar;
                let lookahead = bPos + 1;
                while(lookahead < base.length && /[一-龯]/.test(base[lookahead])) {
                    kanjiBlock += base[lookahead];
                    lookahead++;
                }

                // Find the end of this kanji's reading.
                // Look for the next non-kanji character (okurigana) in the base string.
                let okurigana = '';
                let okuriganaPos = lookahead;
                while(okuriganaPos < base.length && !/[一-龯]/.test(base[okuriganaPos])) {
                    okurigana += base[okuriganaPos];
                    okuriganaPos++;
                }

                let readingForKanji = '';
                const okuriganaIndexInReading = okurigana ? reading.indexOf(okurigana, rPos) : -1;

                if (okuriganaIndexInReading !== -1) {
                    readingForKanji = reading.substring(rPos, okuriganaIndexInReading);
                } else {
                    // If no okurigana, the rest of the reading is for the rest of the kanji.
                    const remainingBase = base.substring(bPos);
                    const remainingReading = reading.substring(rPos);
                    if (remainingBase.length === 1) { // A single kanji character left
                         readingForKanji = remainingReading;
                    } else {
                        // This part is tricky; we'll assume the rest of the reading corresponds to the rest of the base.
                        // A more advanced algorithm would be needed for complex cases.
                        readingForKanji = remainingReading.slice(0, remainingReading.length - (remainingBase.length - kanjiBlock.length));
                    }
                }
                
                const baseElement = interactiveKanji ? <InteractiveKanji text={kanjiBlock} /> : kanjiBlock;
                result.push(
                     <ruby key={bPos}>
                        {baseElement}
                        <rt className="text-xs text-text-muted select-none">{readingForKanji}</rt>
                    </ruby>
                );
                
                rPos += readingForKanji.length;
                bPos += kanjiBlock.length;

            } else { // It's kana
                result.push(bChar);
                rPos++;
                bPos++;
            }
        }
        return result;
    }, [base, reading, interactiveKanji, showFurigana]);

    if (!showFurigana) {
        return interactiveKanji ? <InteractiveKanji text={base} /> : base;
    }

    return <>{content}</>;
});
