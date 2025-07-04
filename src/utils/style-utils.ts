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
