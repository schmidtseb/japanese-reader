// ui/tooltip.ts
import * as dom from '../dom.ts';

let pinnedSegment: HTMLElement | null = null;
let hideTimeout: number;

export function hideTooltip() {
    dom.tooltip.classList.add('opacity-0', 'invisible', 'pointer-events-none');
    if (pinnedSegment) {
        pinnedSegment.classList.remove('tooltip-active'); // A class for potential future styling
        pinnedSegment = null;
    }
};

const cancelHide = () => clearTimeout(hideTimeout);
const scheduleHide = () => {
    hideTimeout = window.setTimeout(hideTooltip, 300);
};

function showTooltip(segment: HTMLElement) {
    cancelHide();

    const { reading, english, patterns: patternsJson, category, wordUrl } = segment.dataset;
    let tooltipHtml = '';
    let wordInfoHtml = '';

    if (category) {
        const formattedCategory = category
            .replace(/_/g, ' ')
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(', ');
        wordInfoHtml += `<p class="text-xs text-text-muted"><strong class="font-medium text-text-secondary">Category:</strong> ${formattedCategory}</p>`;
    }

    wordInfoHtml += `<p class="text-xs text-text-muted mt-1"><strong class="font-medium text-text-secondary">Reading:</strong> ${reading || 'N/A'}</p>`;
    wordInfoHtml += `<p class="text-xs text-text-muted mt-1"><strong class="font-medium text-text-secondary">English:</strong> ${english || 'N/A'}</p>`;

    if (wordUrl && wordUrl.includes('http')) { // Basic validation
        wordInfoHtml += `<div class="mt-2"><a href="${wordUrl}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">Search on Jisho <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div>`;
    }
    
    if (wordInfoHtml) {
        tooltipHtml += `<div class="mb-3"><h4 class="text-sm font-semibold border-b border-border-subtle pb-1 mb-1 text-text-primary">Word Info</h4>${wordInfoHtml}</div>`;
    }


    if (patternsJson) {
      try {
        JSON.parse(patternsJson).forEach((p: any) => {
          tooltipHtml += `<div class="mb-2 last:mb-0"><div class="flex items-center gap-2 mb-1"><span class="flex-shrink-0 w-3 h-3 rounded-sm bg-${p.idClass}"></span><h4 class="font-semibold text-accent">${p.name}</h4></div><p class="text-xs text-text-muted">${p.explanation}</p></div>`;
        });
      } catch (e) {
        console.error("Failed to parse patterns JSON", e);
      }
    }

    if (!tooltipHtml) {
        hideTooltip();
        return;
    }

    dom.tooltip.innerHTML = tooltipHtml;
    dom.tooltip.style.visibility = 'hidden'; // Render invisibly to measure
    dom.tooltip.classList.remove('opacity-0', 'invisible', 'pointer-events-none');
    
    const segmentRect = segment.getBoundingClientRect();
    const tooltipRect = dom.tooltip.getBoundingClientRect();
    const viewportMargin = 10;

    let left = segmentRect.left + (segmentRect.width / 2) - (tooltipRect.width / 2);
    if (left < viewportMargin) left = viewportMargin;
    if (left + tooltipRect.width > window.innerWidth - viewportMargin) {
      left = window.innerWidth - tooltipRect.width - viewportMargin;
    }

    let top = segmentRect.top - tooltipRect.height - 10;
    if (top < viewportMargin) {
        top = segmentRect.bottom + 10;
    }
    
    dom.tooltip.style.left = `${left}px`;
    dom.tooltip.style.top = `${top}px`;
    dom.tooltip.style.visibility = 'visible';
};


export function pinTooltipFor(segment: HTMLElement) {
    if (pinnedSegment) {
        pinnedSegment.classList.remove('tooltip-active');
    }
    pinnedSegment = segment;
    pinnedSegment.classList.add('tooltip-active');
    showTooltip(segment);
}

export function isTooltipPinnedFor(segment: HTMLElement): boolean {
    return pinnedSegment === segment;
}

function isAnyTooltipPinned(): boolean {
    return pinnedSegment !== null;
}

/** Sets up an interactive tooltip that works on hover for desktop. Click/tap is handled in handlers.ts. */
export function setupSmartTooltip() {
    // Only enable hover events on devices that support it (i.e., non-touch primary)
    if (window.matchMedia('(hover: hover)').matches) {
        // Hover to show (for desktop)
        dom.resultContainer.addEventListener('mouseover', (event) => {
            if (isAnyTooltipPinned()) return; // Don't show on hover if a tooltip is pinned
            const segment = (event.target as HTMLElement).closest<HTMLElement>('.segment');
            if (segment) {
                showTooltip(segment);
            }
        });

        // Mouse out to hide (for desktop)
        dom.resultContainer.addEventListener('mouseout', (event) => {
            if (isAnyTooltipPinned()) return; // Don't hide on mouseout if a tooltip is pinned
            if ((event.target as HTMLElement).closest('.segment')) {
                scheduleHide();
            }
        });
    }

    // Clicking outside the tooltip or a segment hides the pinned tooltip
    document.addEventListener('click', (event) => {
        if (!isAnyTooltipPinned()) return;
        
        const isClickOnSegment = (event.target as HTMLElement).closest<HTMLElement>('.segment');
        const isClickInsideTooltip = dom.tooltip.contains(event.target as Node);
        
        // If the click is not on a segment and not inside the tooltip, hide it.
        // The main click handler for segments in handlers.ts stops propagation, so this won't fire for segment clicks.
        if (!isClickOnSegment && !isClickInsideTooltip) {
             hideTooltip();
        }
    });

    // Keep tooltip open when hovering over it
    dom.tooltip.addEventListener('mouseover', cancelHide);
    dom.tooltip.addEventListener('mouseout', () => {
        // Only schedule a hide if the tooltip is not pinned.
        if (!isAnyTooltipPinned()) {
            scheduleHide();
        }
    });
}
