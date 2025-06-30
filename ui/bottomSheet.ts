// ui/bottomSheet.ts
import * as dom from '../dom.ts';

let isSheetOpen = false;
let currentSegment: HTMLElement | null = null;

/**
 * Generates the title and HTML content for the bottom sheet based on a segment's data.
 * @param segment The HTML element of the sentence segment.
 * @returns An object with title and content, or null if there's nothing to show.
 */
function getSegmentDetailsHTML(segment: HTMLElement): { title: string; content: string } | null {
    const segmentData = segment.dataset;
    const japaneseText = segmentData.japaneseSegment || segment.textContent?.trim() || '';

    const { reading, english, patterns: patternsJson, category, wordUrl } = segmentData;

    if (!reading && !english && !patternsJson && !category) return null;

    const title = japaneseText;
    let contentHtml = '';
    let wordInfoHtml = '';

    if (category) {
        const formattedCategory = category
            .replace(/_/g, ' ')
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(', ');
        wordInfoHtml += `<p class="text-sm text-text-muted"><strong class="font-medium text-text-secondary">Category:</strong> ${formattedCategory}</p>`;
    }

    wordInfoHtml += `<p class="text-sm text-text-muted mt-2"><strong class="font-medium text-text-secondary">Reading:</strong> ${reading || 'N/A'}</p>`;
    wordInfoHtml += `<p class="text-sm text-text-muted mt-1"><strong class="font-medium text-text-secondary">English:</strong> ${english || 'N/A'}</p>`;

    if (wordUrl && wordUrl.includes('http')) {
        wordInfoHtml += `<div class="mt-3"><a href="${wordUrl}" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-accent hover:underline inline-flex items-center gap-1.5">Search on Jisho <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div>`;
    }
    
    if (wordInfoHtml) {
        contentHtml += `<div class="mb-4"><h4 class="text-base font-semibold border-b border-border-subtle pb-2 mb-2 text-text-primary">Word Info</h4>${wordInfoHtml}</div>`;
    }

    if (patternsJson) {
      try {
        const patterns = JSON.parse(patternsJson);
        if (patterns.length > 0) {
            contentHtml += `<h4 class="text-base font-semibold border-b border-border-subtle pb-2 mb-2 text-text-primary">Grammar Patterns</h4>`;
            contentHtml += `<div class="space-y-3">`;
            patterns.forEach((p: any) => {
              contentHtml += `<div><div class="flex items-center gap-3 mb-1.5"><span class="flex-shrink-0 w-3.5 h-3.5 rounded-sm bg-${p.idClass}"></span><h5 class="font-semibold text-accent">${p.name}</h5></div><p class="text-sm text-text-muted">${p.explanation}</p></div>`;
            });
            contentHtml += `</div>`;
        }
      } catch (e) {
        console.error("Failed to parse patterns JSON for bottom sheet", e);
      }
    }

    return (contentHtml.trim()) ? { title, content: contentHtml } : null;
}

/** Hides the bottom sheet with a smooth animation. */
export function hideBottomSheet() {
    if (!isSheetOpen) return;
    dom.bottomSheet.classList.add('translate-y-full');
    
    if (currentSegment) {
        currentSegment.classList.remove('bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30');
        currentSegment = null;
    }
    isSheetOpen = false;
}

/**
 * Shows the bottom sheet for a given segment, updating its content and handling animations.
 * @param segment The sentence segment element that was clicked.
 */
export function showBottomSheetForSegment(segment: HTMLElement) {
    if ((segment.dataset.category || '').toUpperCase() === 'PUNCTUATION') {
        return;
    }
    
    const details = getSegmentDetailsHTML(segment);
    if (!details) {
        if (isSheetOpen) hideBottomSheet();
        return;
    }
    
    if (currentSegment && currentSegment !== segment) {
        currentSegment.classList.remove('bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30');
    }
    segment.classList.add('bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30');
    currentSegment = segment;
    
    const updateContent = () => {
        dom.bottomSheetTitle.textContent = details.title;
        dom.bottomSheetContent.innerHTML = details.content;
        dom.bottomSheetContent.scrollTop = 0;
    };

    if (isSheetOpen) {
        dom.bottomSheetContent.style.transition = 'opacity 0.1s ease-in-out';
        dom.bottomSheetContent.style.opacity = '0';
        setTimeout(() => {
            updateContent();
            dom.bottomSheetContent.style.opacity = '1';
            setTimeout(() => dom.bottomSheetContent.style.transition = '', 150);
        }, 100);
    } else {
        updateContent();
        dom.bottomSheet.classList.remove('translate-y-full');
        isSheetOpen = true;
    }
}

/** Sets up event listeners for the bottom sheet's close button. */
export function initializeBottomSheet() {
    dom.bottomSheetCloseButton.addEventListener('click', hideBottomSheet);
}