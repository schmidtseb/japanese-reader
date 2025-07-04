// ui/components/PitchAccentVisualizer.tsx
import React from 'react';
import { useSettings } from '../contexts/index.ts';

export const PitchAccentVisualizer = React.memo(function PitchAccentVisualizer({ reading, pitchAccent }: { reading: string, pitchAccent: string }) {
    const { state } = useSettings();
    if (!state.showPitchAccent || !reading || !pitchAccent || reading.length !== pitchAccent.length) return null;

    const points = pitchAccent.split('').map((p, i) => ({ x: (100 / reading.length) * (i + 0.5), y: p === 'H' ? 2 : 8 }));

    return (
        <svg
            className="pitch-accent-svg absolute top-0 left-0 w-full h-[14px] overflow-visible pointer-events-none"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
        >
            {points.length > 1 && (
                <polyline
                    points={points.map(p => `${p.x},${p.y}`).join(' ')}
                    className="fill-none stroke-text-muted"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.2" className="fill-text-muted" />
            ))}
        </svg>
    );
});
