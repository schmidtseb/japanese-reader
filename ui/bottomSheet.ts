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

/** Dynamically sets the max-height of the bottom sheet to avoid overlapping sticky/fixed headers. */
function setSheetSize() {
    // This function handles both reading mode (fixed header) and main analysis view (sticky header).
    let headerHeight = 0;
    const margin = 0; // As per requirement, touching is fine, overlap is not.

    // Case 1: Reading Mode (fixed header)
    const readingHeader = document.getElementById('reading-mode-header');
    const isReadingMode = readingHeader && !dom.readingModeView.classList.contains('hidden');
    if (isReadingMode) {
        headerHeight = readingHeader.offsetHeight;
    }
    // Case 2: Main Analysis View (sticky header)
    else {
        const analysisHeader = dom.analysisView.querySelector<HTMLElement>('.sticky');
        const isAnalysisView = analysisHeader && !dom.analysisView.classList.contains('hidden');
        if (isAnalysisView) {
            const headerRect = analysisHeader.getBoundingClientRect();
            // A sticky element's rect.top will be at the top of the viewport when it's "stuck".
            // Give it a small tolerance for sub-pixel rendering.
            if (headerRect.top <= 1) {
                headerHeight = headerRect.height;
            }
        }
    }

    if (headerHeight > 0) {
        const availableHeight = window.innerHeight - headerHeight;
        const vh60InPixels = window.innerHeight * 0.6; // The default max-height from Tailwind (max-h-[60vh])
        
        // Use the smaller of the two constraints to ensure we don't exceed the intended design or overlap the header.
        const finalMaxHeight = Math.min(availableHeight - margin, vh60InPixels);
        dom.bottomSheet.style.maxHeight = `${finalMaxHeight}px`;
    } else {
        // Revert to default Tailwind class behavior if no applicable sticky/fixed header is found.
        dom.bottomSheet.style.maxHeight = '';
    }
}

/** Hides the bottom sheet with a smooth animation. */
export function hideBottomSheet() {
    if (!isSheetOpen) return;
    // Remove scroll lock from the body
    document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
    
    dom.bottomSheet.classList.add('translate-y-full');
    dom.bottomSheetOverlay.classList.add('opacity-0', 'invisible');

    // Reset max-height so it uses the default Tailwind class on next open.
    dom.bottomSheet.style.maxHeight = '';
    
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
        // While content is invisible, recalculate the max-height in case viewport/header changed.
        setSheetSize();
        setTimeout(() => {
            updateContent();
            dom.bottomSheetContent.style.opacity = '1';
            setTimeout(() => dom.bottomSheetContent.style.transition = '', 150);
        }, 100);
    } else {
        updateContent();
        // Set the size *before* showing the sheet.
        setSheetSize();
        // Add scroll lock to the body for mobile only
        document.body.classList.add('overflow-hidden', 'md:overflow-auto');
        dom.bottomSheet.classList.remove('translate-y-full');
        dom.bottomSheetOverlay.classList.remove('opacity-0', 'invisible');
        isSheetOpen = true;
    }
}

/** Sets up event listeners for the bottom sheet's close button and overlay. */
export function initializeBottomSheet() {
    dom.bottomSheetCloseButton.addEventListener('click', hideBottomSheet);
    dom.bottomSheetOverlay.addEventListener('click', hideBottomSheet);
    // Also recalculate size on resize events, but only if the sheet is open.
    window.addEventListener('resize', () => {
        if (isSheetOpen) {
            setSheetSize();
        }
    });
}