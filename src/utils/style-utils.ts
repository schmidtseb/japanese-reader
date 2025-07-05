// ui/utils/style-utils.ts
/** Maps a grammatical category from the API to a Tailwind CSS class. */
export function getCategoryClass(category: string): string {
    const cat = (category || 'unknown').split(/[-_]/)[0].toLowerCase();
    const classMap: { [key: string]: string } = {
        noun: 'bg-pos-noun-bg text-pos-noun-text',
        verb: 'bg-pos-verb-bg text-pos-verb-text',
        particle: 'bg-pos-particle-bg text-pos-particle-text',
        adjective: 'bg-pos-adjective-bg text-pos-adjective-text',
        adverb: 'bg-pos-adverb-bg text-pos-adverb-text',
        auxiliary: 'bg-pos-auxiliary-bg text-pos-auxiliary-text',
        grammatical: 'bg-pos-auxiliary-bg text-pos-auxiliary-text',
        conjunction: 'bg-pos-conjunction-bg text-pos-conjunction-text',
        suffix: 'bg-pos-suffix-bg text-pos-suffix-text',
        punctuation: 'bg-transparent',
        unknown: 'bg-surface-soft'
    };
    return classMap[cat] || classMap.unknown;
}

/**
 * Generates a visually distinct color for a grammar pattern based on its index.
 * Uses the golden angle to ensure generated colors are well-spaced on the color wheel.
 * @param index The index of the pattern.
 * @param theme The current theme ('light' or 'dark').
 * @returns An HSL color string (e.g., 'hsl(137.5, 70%, 45%)').
 */
export function getPatternColor(index: number, theme: 'light' | 'dark'): string {
    const hue = (index * 137.5) % 360;
    
    if (theme === 'dark') {
        // For dark mode, we want lighter, less saturated colors to stand out
        const saturation = 65;
        const lightness = 60;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // For light mode, we want richer, slightly darker colors
    const saturation = 70;
    const lightness = 45;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}