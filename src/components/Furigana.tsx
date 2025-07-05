// ui/components/Furigana.tsx
import React, { useMemo } from 'react';
import { useSettings } from '../contexts/index.ts';
import { InteractiveKanji } from './InteractiveKanji.tsx';

const isKanji = (char: string) => /[一-龯]/.test(char);

export const Furigana = React.memo(function Furigana({ base, reading, interactiveKanji = false }: { base: string, reading?: string, interactiveKanji?: boolean }) {
    const { state } = useSettings();
    const { showFurigana } = state;

    const content = useMemo(() => {
        if (!showFurigana || !reading || base === reading) {
            return interactiveKanji ? <InteractiveKanji text={base} /> : base;
        }

        const result: React.ReactNode[] = [];
        let rPos = 0; // position in reading string
        let bPos = 0; // position in base string

        while(bPos < base.length) {
            if (isKanji(base[bPos])) {
                let kanjiBlock = '';
                let kanjiLookahead = bPos;
                while (kanjiLookahead < base.length && isKanji(base[kanjiLookahead])) {
                    kanjiBlock += base[kanjiLookahead];
                    kanjiLookahead++;
                }

                let okurigana = '';
                let okuriganaLookahead = kanjiLookahead;
                while (okuriganaLookahead < base.length && !isKanji(base[okuriganaLookahead])) {
                    okurigana += base[okuriganaLookahead];
                    okuriganaLookahead++;
                }

                let readingForKanji = '';
                let okuriganaIndexInReading = okurigana ? reading.indexOf(okurigana, rPos) : -1;

                // This is a heuristic to handle cases like '聞き書き' (ききがき) where the kanji's
                // reading ('き') is identical to the okurigana ('き'). A simple indexOf would find
                // the first 'き' and assume an empty reading for the kanji '聞'.
                // If we find the okurigana at the very start of our search area, we look for the *next*
                // occurrence, which is more likely to be the actual okurigana we want to match.
                if (okurigana && okuriganaIndexInReading === rPos) {
                    const nextOccurrence = reading.indexOf(okurigana, rPos + 1);
                    if (nextOccurrence !== -1) {
                        okuriganaIndexInReading = nextOccurrence;
                    }
                }
                
                if (okuriganaIndexInReading !== -1) {
                    readingForKanji = reading.substring(rPos, okuriganaIndexInReading);
                } else {
                    // No okurigana found after the kanji block. This handles cases like `日本` (にほん).
                    // We assume the rest of the reading corresponds to the rest of the base.
                    const remainingBase = base.substring(bPos);
                    const remainingReading = reading.substring(rPos);
                    // The reading for the current kanji block is the part of the remaining reading
                    // that doesn't correspond to any remaining kana characters in the base.
                    const nonKanjiCharsAfter = remainingBase.split('').filter(char => !isKanji(char)).length;
                    readingForKanji = remainingReading.slice(0, remainingReading.length - nonKanjiCharsAfter);
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

            } else { // It's kana (or other non-kanji)
                result.push(base[bPos]);
                // Sync rPos with bPos for matching kana
                if (rPos < reading.length && base[bPos] === reading[rPos]) {
                   rPos++;
                }
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
