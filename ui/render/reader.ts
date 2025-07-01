// ui/render/reader.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';
import { createAnalysisHeaderComponent, createGrammarNotesComponent } from '../components.ts';

/** Renders input text into the reader view, preserving paragraphs and coloring analyzed sentences. */
export function renderReaderView(entry: state.TextEntry) {
    dom.readerView.innerHTML = '';

    if (state.jumpToSentenceButton) {
        state.jumpToSentenceButton.classList.add('opacity-0', 'invisible', 'translate-y-5');
        state.jumpToSentenceButton.classList.remove('transform'); // Reset any scale/rotate transforms
    }
    if (state.analysisHeaderObserver) {
        state.analysisHeaderObserver.disconnect();
        state.setAnalysisHeaderObserver(null);
    }
    if (state.readingModeScrollListener) {
        window.removeEventListener('scroll', state.readingModeScrollListener);
        state.setReadingModeScrollListener(null);
    }
    
    const paragraphsRaw = entry.text.split('\n');
    const paragraphs = paragraphsRaw.map(
        p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []
    );
    const allSentences = paragraphs.flat();

    const hasContent = allSentences.length > 0;
    if (!hasContent) return;

    const viewContainer = document.createElement('div');
    dom.readerView.appendChild(viewContainer);
    
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    
    const titleHeading = document.createElement('h2');
    titleHeading.className = 'text-xl font-bold text-text-primary';
    titleHeading.textContent = entry.title;
    header.appendChild(titleHeading);

    if (allSentences.length > 0) {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex items-center gap-2';
    
        // Edit Button
        const editButton = document.createElement('button');
        editButton.id = 'edit-text-button';
        editButton.className = 'p-2 rounded-full hover:bg-surface-hover focus-ring transition-colors';
        editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`;
        editButton.title = 'Edit this text';
        buttonGroup.appendChild(editButton);
    
        // Start Reading Button
        const startReadingButton = document.createElement('button');
        startReadingButton.id = 'start-reading-button';
        startReadingButton.title = 'Start Reading Mode';
        startReadingButton.className = 'inline-flex items-center justify-center p-2.5 rounded-full text-primary-text bg-accent hover:bg-accent/90 focus-ring shadow-sm';
        startReadingButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
        buttonGroup.appendChild(startReadingButton);
    
        header.appendChild(buttonGroup);
    }
    viewContainer.appendChild(header);
    
    const textContainer = document.createElement('div');
    textContainer.className = 'bg-surface-soft border border-border rounded-lg p-4 sm:p-6 max-h-80 overflow-y-auto no-scrollbar';
    
    paragraphs.forEach(sentences => {
        const paragraphBlock = document.createElement('p');
        paragraphBlock.className = 'text-lg sm:text-xl leading-relaxed'; // Apply styles to all paragraphs for consistent line height

        if (sentences.length > 0) {
            sentences.forEach(sentence => {
                const sentenceSpan = document.createElement('span');
                sentenceSpan.className = 'clickable-sentence cursor-pointer rounded p-1 -m-1 transition-colors duration-200 hover:bg-accent-selected-bg/50';
                
                // Check if the sentence has been analyzed for the current depth
                const isAnalyzed = !!entry.analyzedSentences[sentence]?.[state.analysisDepth];
                if (isAnalyzed) {
                    sentenceSpan.classList.add('text-accent-text');
                    sentenceSpan.title = "Analyzed. Click to view.";
                } else {
                    sentenceSpan.title = "Click to analyze.";
                }

                sentenceSpan.textContent = sentence;
                sentenceSpan.dataset.sentence = sentence;
                paragraphBlock.append(sentenceSpan, ' ');
            });
        } else {
            // This represents an empty line. A non-breaking space ensures the paragraph
            // has height and visually represents the line break.
            paragraphBlock.innerHTML = '&nbsp;';
        }
        
        textContainer.appendChild(paragraphBlock);
    });
    
    viewContainer.appendChild(textContainer);
}

/**
 * Creates the common UI shell for the reading mode (header, nav, etc.).
 * @param sentenceIndex The index of the current sentence.
 * @param totalSentences The total number of sentences.
 * @param options Configuration for the shell, e.g., if controls should be enabled.
 * @returns An object containing the root element and containers for content.
 */
function createReadingModeShell(sentenceIndex: number, totalSentences: number, options: {isLoaded: boolean}) {
    dom.readingModeView.innerHTML = '';
    dom.readingModeView.className = '';

    const fixedHeader = document.createElement('header');
    fixedHeader.id = 'reading-mode-header';
    fixedHeader.className = 'fixed top-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-md shadow-sm header-collapsed';

    const hoverTrigger = document.createElement('div');
    hoverTrigger.id = 'reading-header-hover-trigger';
    hoverTrigger.className = 'hidden md:block absolute top-0 left-0 right-0 h-4 z-20';
    fixedHeader.appendChild(hoverTrigger);

    const headerContentWrapper = document.createElement('div');
    headerContentWrapper.id = 'reading-mode-content-container';
    headerContentWrapper.className = 'max-w-4xl mx-auto p-2 space-y-2';
    fixedHeader.appendChild(headerContentWrapper);

    const navWrapper = document.createElement('div');
    navWrapper.id = 'reading-mode-nav-wrapper';
    headerContentWrapper.appendChild(navWrapper);

    const navControls = document.createElement('div');
    navControls.className = 'flex justify-between items-center';
    navControls.innerHTML = `
        <button id="reading-mode-exit" title="Exit Reading Mode" class="p-2 rounded-full hover:bg-surface-hover transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <div class="font-medium text-text-secondary flex items-center gap-1">
            <input type="number" id="reading-mode-sentence-input" value="${sentenceIndex + 1}" min="1" max="${totalSentences}" title="Enter sentence number and press Enter" class="w-12 text-center bg-surface-subtle rounded-md p-1 focus:ring-2 focus:ring-focus-ring focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
            <span>/ ${totalSentences}</span>
        </div>
        <div class="flex items-center gap-2">
            <button id="reading-nav-prev" title="Previous Sentence (←)" class="p-2 rounded-full hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed" ${sentenceIndex === 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button id="reading-nav-next" title="Next Sentence (→)" class="p-2 rounded-full hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed" ${!options.isLoaded || sentenceIndex >= totalSentences - 1 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    `;
    navWrapper.appendChild(navControls);

    const scrollableContent = document.createElement('main');
    scrollableContent.id = 'reading-mode-content-wrapper';
    
    // Set padding on scrollable content to avoid being obscured by the fixed header
    const setPadding = () => {
        const headerHeight = fixedHeader.offsetHeight - 30;
        // Check current padding to avoid unnecessary style changes which can trigger reflow
        if (headerHeight > 0 && scrollableContent.style.paddingTop !== `${headerHeight}px`) {
          scrollableContent.style.paddingTop = `${headerHeight}px`;
        }
    };
    
    // Observe changes to the header size (e.g., mobile nav toggle) and adjust padding
    const resizeObserver = new ResizeObserver(() => {
        // Use requestAnimationFrame to prevent layout thrashing
        requestAnimationFrame(setPadding);
    });
    resizeObserver.observe(fixedHeader);
    
    // Append to the main view element
    dom.readingModeView.append(fixedHeader, scrollableContent);
    
    // Call setPadding after elements are in the DOM to get correct height.
    // Use rAF for better timing. Call it twice to handle potential double reflows on complex loads.
    requestAnimationFrame(() => {
        setPadding();
        requestAnimationFrame(setPadding);
    });

    return { headerContentWrapper, scrollableContent };
}

/** Renders the focused reading mode UI. */
export function renderReadingModeView(entry: state.TextEntry, sentenceIndex: number, analysisData: any) {
    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
    const totalSentences = sentences.length;
    const segmentElements: HTMLElement[] = [];

    const { headerContentWrapper, scrollableContent } = createReadingModeShell(sentenceIndex, totalSentences, { isLoaded: true });

    // Interactive sentence header
    const toggleButton = document.createElement('button');
    toggleButton.id = 'reading-header-toggle';
    toggleButton.title = 'Toggle navigation controls';
    toggleButton.className = 'md:hidden z-10 p-2 rounded-full bg-surface/50 hover:bg-surface-hover transition-colors';
    toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>`;

    const analysisHeader = createAnalysisHeaderComponent(analysisData, segmentElements, {
      wrapperClasses: ['p-3', 'min-h-48'],
      sentenceContainerClasses: ['text-xl', 'font-medium', 'font-japanese', 'pr-12'],
      extraControls: [toggleButton]
    });
    headerContentWrapper.appendChild(analysisHeader);
    
    // Scrollable content (grammar notes)
    const innerScrollable = document.createElement('div');
    innerScrollable.className = 'max-w-4xl mx-auto p-2 md:p-4';
    scrollableContent.appendChild(innerScrollable);

    const grammarNotes = createGrammarNotesComponent(analysisData, segmentElements);
    innerScrollable.appendChild(grammarNotes);
}

/** Renders a loading state for the reading mode, including sentence preview. */
export function renderReadingModeLoading(entry: state.TextEntry, sentenceIndex: number) {
    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
    const sentence = sentences[sentenceIndex];
    const totalSentences = sentences.length;

    const { headerContentWrapper, scrollableContent } = createReadingModeShell(sentenceIndex, totalSentences, { isLoaded: false });

    // Placeholder for sentence
    const sentenceWrapper = document.createElement('div');
    sentenceWrapper.className = 'relative p-3 bg-surface-soft rounded-lg max-h-[50vh] overflow-y-auto no-scrollbar';
    headerContentWrapper.appendChild(sentenceWrapper);

    const toggleButton = document.createElement('button');
    toggleButton.id = 'reading-header-toggle';
    toggleButton.title = 'Toggle navigation controls';
    toggleButton.className = 'md:hidden absolute top-2 right-2 z-10 p-2 rounded-full bg-surface/50 hover:bg-surface-hover';
    toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>`;
    sentenceWrapper.appendChild(toggleButton);

    const sentenceTextWrapper = document.createElement('div');
    sentenceTextWrapper.className = 'flex-grow flex items-center gap-4 text-xl font-medium font-japanese text-text-muted pr-10';
    sentenceTextWrapper.innerHTML = `
      <p class="flex-grow">${sentence}</p>
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-accent flex-shrink-0"></div>
    `;
    sentenceWrapper.appendChild(sentenceTextWrapper);
    
    // Loading message in scrollable area
    const innerScrollable = document.createElement('div');
    innerScrollable.className = 'max-w-4xl mx-auto p-6 text-center text-text-muted';
    innerScrollable.textContent = 'Fetching analysis and grammar notes...';
    scrollableContent.appendChild(innerScrollable);
}
