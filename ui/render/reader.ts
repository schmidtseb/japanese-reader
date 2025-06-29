
// ui/render/reader.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';
import { renderSingleAnalysis } from './analysis.ts';

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
        p => p.match(/[^。？！\s]+[。？！]?/g)?.filter(s => s?.trim()) || []
    );
    const allSentences = paragraphs.flat();

    const hasContent = allSentences.length > 0;
    if (!hasContent) return;

    const viewContainer = document.createElement('div');
    dom.readerView.appendChild(viewContainer);
    
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    
    const titleHeading = document.createElement('h2');
    titleHeading.className = 'text-xl font-bold text-neutral-800 dark:text-neutral-200';
    titleHeading.textContent = entry.title;
    header.appendChild(titleHeading);

    if (allSentences.length > 0) {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex items-center gap-2';
    
        // Edit Button
        const editButton = document.createElement('button');
        editButton.id = 'edit-text-button';
        editButton.className = 'p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 focus:ring-sky-500 transition-colors';
        editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`;
        editButton.title = 'Edit this text';
        buttonGroup.appendChild(editButton);
    
        // Start Reading Button
        const startReadingButton = document.createElement('button');
        startReadingButton.id = 'start-reading-button';
        startReadingButton.title = 'Start Reading Mode';
        startReadingButton.className = 'inline-flex items-center justify-center p-2.5 rounded-full text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 focus:ring-sky-500 dark:bg-sky-500 dark:hover:bg-sky-600 dark:text-neutral-900 shadow-sm';
        startReadingButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
        buttonGroup.appendChild(startReadingButton);
    
        header.appendChild(buttonGroup);
    }
    viewContainer.appendChild(header);
    
    const textContainer = document.createElement('div');
    textContainer.className = 'bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 sm:p-6 max-h-80 overflow-y-auto';
    
    paragraphs.forEach(sentences => {
        const paragraphBlock = document.createElement('p');
        paragraphBlock.className = 'text-lg sm:text-xl leading-relaxed'; // Apply styles to all paragraphs for consistent line height

        if (sentences.length > 0) {
            sentences.forEach(sentence => {
                const sentenceSpan = document.createElement('span');
                sentenceSpan.className = 'clickable-sentence cursor-pointer rounded p-1 -m-1 transition-colors duration-200 hover:bg-sky-100 dark:hover:bg-sky-500/20';
                
                // Check if the sentence has been analyzed for the current depth
                const isAnalyzed = !!entry.analyzedSentences[sentence]?.[state.analysisDepth];
                if (isAnalyzed) {
                    sentenceSpan.classList.add('text-sky-700', 'dark:text-sky-400');
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

/** Renders the focused reading mode UI. */
export function renderReadingModeView(entry: state.TextEntry, sentenceIndex: number, analysisData: any) {
    dom.readingModeView.innerHTML = ''; // Clear previous content
    dom.readingModeView.className = ''; // Reset container class

    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！\s]+[。？！]?/g)?.filter(s => s?.trim()) || []);
    const totalSentences = sentences.length;

    // 1. Navigation Header - FIXED
    const navHeader = document.createElement('header');
    // Use a backdrop blur for a modern, sleek look. The background is slightly transparent.
    navHeader.className = 'fixed top-0 left-0 right-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 duration-300';

    const navHeaderContent = document.createElement('div');
    // The inner div constrains the content to match the main app layout
    navHeaderContent.className = 'max-w-4xl mx-auto flex items-center justify-between p-2';
    navHeaderContent.innerHTML = `
        <button id="reading-mode-exit" title="Exit Reading Mode" class="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-neutral-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <div class="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
            <input type="number" id="reading-mode-sentence-input" value="${sentenceIndex + 1}" min="1" max="${totalSentences}" title="Enter sentence number and press Enter" class="w-12 text-center bg-neutral-200 dark:bg-neutral-700 rounded-md p-1 focus:ring-2 focus:ring-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
            <span>/ ${totalSentences}</span>
        </div>
        <div class="flex items-center gap-2">
            <button id="reading-nav-prev" title="Previous Sentence (←)" class="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed" ${sentenceIndex === 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button id="reading-nav-next" title="Next Sentence (→)" class="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed" ${sentenceIndex >= totalSentences - 1 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    `;
    navHeader.appendChild(navHeaderContent);
    dom.readingModeView.appendChild(navHeader);

    // 2. Analysis Container
    const analysisContainer = document.createElement('div');

    // The sticky header inside analysis will now stick below the fixed header.
    renderSingleAnalysis(analysisContainer, analysisData, { stickyTopClass: 'top-14' });
    dom.readingModeView.appendChild(analysisContainer);
}

/** Renders a loading state for the reading mode. */
export function renderReadingModeLoading(sentenceIndex: number, totalSentences: number, message: string = 'Loading analysis...') {
    dom.readingModeView.innerHTML = ''; // Clear previous content
    dom.readingModeView.className = ''; // Reset container class

    // 1. Navigation Header - FIXED
    const navHeader = document.createElement('header');
    navHeader.className = 'fixed top-0 left-0 right-0 z-20 border-b border-neutral-200/50 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm transition-colors duration-300';

    const navHeaderContent = document.createElement('div');
    navHeaderContent.className = 'max-w-4xl mx-auto flex items-center justify-between p-4';
    navHeaderContent.innerHTML = `
        <button id="reading-mode-exit" title="Exit Reading Mode" class="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-neutral-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <div class="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
            <input type="number" id="reading-mode-sentence-input" value="${sentenceIndex + 1}" min="1" max="${totalSentences}" title="Enter sentence number and press Enter" class="w-12 text-center bg-neutral-200 dark:bg-neutral-700 rounded-md p-1 focus:ring-2 focus:ring-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" disabled>
            <span>/ ${totalSentences}</span>
        </div>
        <div class="flex items-center gap-2">
            <button id="reading-nav-prev" title="Previous Sentence (←)" class="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button id="reading-nav-next" title="Next Sentence (→)" class="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    `;
    navHeader.appendChild(navHeaderContent);
    dom.readingModeView.appendChild(navHeader);

    // 2. Content Container with Loader
    const contentContainer = document.createElement('div');
    contentContainer.style.paddingTop = '4.5625rem';
    contentContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center p-16 text-neutral-500">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500 mb-4"></div>
            <p>${message}</p>
        </div>
    `;
    dom.readingModeView.appendChild(contentContainer);
}
