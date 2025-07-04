// ui/components/InteractiveKanji.tsx
import React, { useMemo } from 'react';

export const InteractiveKanji = React.memo(function InteractiveKanji({ text }: { text: string }) {
    const parts = useMemo(() => text.split('').map((char, index) => {
        if (/[一-龯]/.test(char)) {
            return (
                <a 
                    key={index}
                    href={`https://jisho.org/search/${encodeURIComponent(char)}%20%23kanji`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-text-muted/50 decoration-1 underline-offset-2 hover:text-accent hover:decoration-accent transition"
                    onClick={e => e.stopPropagation()}
                >
                    {char}
                </a>
            );
        }
        return char;
    }), [text]);

    return <>{parts}</>;
});
