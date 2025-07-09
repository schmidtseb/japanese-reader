// src/utils/string-similarity.ts

/**
 * Calculates the Levenshtein distance between two strings.
 * This is a measure of the difference between two sequences.
 * @param a The first string.
 * @param b The second string.
 * @returns The number of edits (insertions, deletions, substitutions) needed to change `a` into `b`.
 */
function levenshtein(a: string, b: string): number {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;

    const matrix = Array.from({ length: an + 1 }, () => Array(bn + 1).fill(0));

    for (let i = 0; i <= an; i++) matrix[i][0] = i;
    for (let j = 0; j <= bn; j++) matrix[0][j] = j;

    for (let i = 1; i <= an; i++) {
        for (let j = 1; j <= bn; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // Deletion
                matrix[i][j - 1] + 1,      // Insertion
                matrix[i - 1][j - 1] + cost // Substitution
            );
        }
    }
    return matrix[an][bn];
}


/**
 * Compares two strings for similarity, allowing for minor typos and variations in the correct answer.
 * Handles multiple answers separated by '/', ',', or ';', and information in parentheses.
 * @param userInput The string provided by the user.
 * @param correctAnswer The correct string to compare against, which may contain variations.
 * @returns A boolean indicating if the strings are similar enough to be considered correct.
 */
export function isSimilar(userInput: string, correctAnswer: string): boolean {
    const s1 = userInput.trim().toLowerCase();
    
    if (!correctAnswer) {
        return s1 === '';
    }
    
    const s2 = correctAnswer.trim().toLowerCase();

    // Exact match first for performance
    if (s1 === s2) return true;

    // Create a set of possible answers.
    // 1. Answers with parentheses content removed. e.g., "to go (out)" -> "to go"
    const baseAnswers = s2.replace(/\s*\([^)]*\)/g, '').trim().split(/[,\/;]/).map(s => s.trim()).filter(Boolean);
    
    // 2. Answers with parentheses characters removed, keeping the content. e.g., "to go (out)" -> "to go out"
    const expandedAnswers = s2.replace(/[()]/g, '').trim().split(/[,\/;]/).map(s => s.trim()).filter(Boolean);
    
    // Combine and get unique answers
    const allPossibleAnswers = [...new Set([...baseAnswers, ...expandedAnswers])];

    // Check for exact match against any of the possible answers.
    if (allPossibleAnswers.some(ans => s1 === ans)) {
        return true;
    }

    // Check for similarity using Levenshtein distance for each possible answer.
    return allPossibleAnswers.some(ans => {
        const distance = levenshtein(s1, ans);
        const maxLength = Math.max(s1.length, ans.length);

        // More lenient for short answers, stricter for long ones.
        if (maxLength <= 4) return distance <= 1; // e.g. "car" vs "cat"
        if (maxLength <= 10) return distance <= 2; // e.g. "beautiful" vs "beautifull"
        
        // Allow up to ~20% of the string length in typos for longer answers.
        return distance <= Math.floor(maxLength * 0.2);
    });
}