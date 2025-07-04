// ui/components/HotkeyLegend.tsx
import React from 'react';

export const HotkeyLegend = () => (
    <div className="mt-6 p-4 border-t border-border-subtle text-center">
        <h4 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-3">Hotkeys</h4>
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
            <span><kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">F</kbd> Furigana</span>
            <span><kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">C</kbd> Colors</span>
            <span><kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">T</kbd> Translate</span>
            <span><kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">S</kbd> Speak</span>
            <div className="w-px h-4 bg-border mx-2 self-center"></div>
            <span><kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">J</kbd>/<kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">K</kbd> Nav</span>
            <span><kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">E</kbd> Examples</span>
            <span><kbd className="font-sans font-semibold p-1 px-1.5 rounded bg-surface border border-border-subtle shadow-sm">Esc</kbd> Deselect</span>
        </div>
    </div>
);
