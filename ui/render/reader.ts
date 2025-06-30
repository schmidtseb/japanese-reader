// ui/render/reader.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';
import { speakText } from '../../services/tts.ts';
import { getCategoryClass, createPitchAccentVisualizer, createFuriganaHTML } from '../components.ts';

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
    textContainer.className = 'bg-surface-soft border border-border rounded-lg p-4 sm:p-6 max-h-80 overflow-y-auto';
    
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

/** Renders the focused reading mode UI. */
export function renderReadingModeView(entry: state.TextEntry, sentenceIndex: number, analysisData: any) {
    dom.readingModeView.innerHTML = ''; // Clear previous content
    dom.readingModeView.className = ''; // Remove old layout classes

    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
    const totalSentences = sentences.length;
    const segmentElements: HTMLElement[] = [];

    // 1. Main Fixed Header (contains controls and interactive sentence)
    const fixedHeader = document.createElement('header');
    fixedHeader.id = 'reading-mode-header';
    fixedHeader.className = 'fixed top-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-md shadow-sm header-collapsed';
    dom.readingModeView.appendChild(fixedHeader);

    // New hover trigger for desktop
    const hoverTrigger = document.createElement('div');
    hoverTrigger.id = 'reading-header-hover-trigger';
    hoverTrigger.className = 'hidden md:block absolute top-0 left-0 right-0 h-4 z-20';
    fixedHeader.appendChild(hoverTrigger);

    const headerContentWrapper = document.createElement('div');
    headerContentWrapper.id = 'reading-mode-content-container';
    headerContentWrapper.className = 'max-w-4xl mx-auto p-2 space-y-2';
    fixedHeader.appendChild(headerContentWrapper);

    // Wrapper for collapsible nav
    const navWrapper = document.createElement('div');
    navWrapper.id = 'reading-mode-nav-wrapper';
    headerContentWrapper.appendChild(navWrapper);
    
    // 1a. Navigation controls (now inside the wrapper)
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
            <button id="reading-nav-next" title="Next Sentence (→)" class="p-2 rounded-full hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed" ${sentenceIndex >= totalSentences - 1 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    `;
    navWrapper.appendChild(navControls);

    // 1b. Interactive sentence (the always-visible part)
    const sentenceWrapper = document.createElement('div');
    sentenceWrapper.className = 'relative p-3 bg-surface-soft rounded-lg max-h-[50vh] overflow-y-auto';
    headerContentWrapper.appendChild(sentenceWrapper);

    const toggleButton = document.createElement('button');
    toggleButton.id = 'reading-header-toggle';
    toggleButton.title = 'Toggle navigation controls';
    toggleButton.className = 'md:hidden absolute top-2 right-2 z-10 p-2 rounded-full bg-surface/50 hover:bg-surface-hover transition-colors';
    toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>`;
    sentenceWrapper.appendChild(toggleButton);

    const sentenceContainer = document.createElement('div');
    sentenceContainer.className = 'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xl font-medium font-japanese pr-12';
    sentenceWrapper.appendChild(sentenceContainer);
    
    analysisData.analysis.forEach((segment: any) => {
        const segmentEl = document.createElement('span');
        segmentEl.className = `segment relative inline-block rounded-md px-2 py-1 cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 leading-loose ${getCategoryClass(segment.category)}`;
        segmentEl.dataset.japaneseSegment = segment.japanese_segment;
        segmentEl.dataset.reading = segment.reading;
        segmentEl.dataset.english = segment.english_equivalent;
        segmentEl.dataset.category = segment.category;
        segmentEl.dataset.wordUrl = `https://jisho.org/search/${encodeURIComponent(segment.japanese_segment)}`;
        
        if (segment.category !== 'PUNCTUATION') {
            const pitchVisualizer = createPitchAccentVisualizer(segment.reading, segment.pitch_accent);
            if (pitchVisualizer) segmentEl.appendChild(pitchVisualizer);
        }

        const contentWrapper = document.createElement('div');
        contentWrapper.innerHTML = createFuriganaHTML(segment.japanese_segment, segment.reading, true);
        segmentEl.appendChild(contentWrapper);
        
        sentenceContainer.appendChild(segmentEl);
        segmentElements.push(segmentEl);
    });

    const sentenceControls = document.createElement('div');
    sentenceControls.className = 'absolute top-12 right-2 z-10 flex flex-col gap-1.5';
    sentenceWrapper.appendChild(sentenceControls);
    
    const reanalyzeButton = document.createElement('button');
    reanalyzeButton.id = 're-analyze-button';
    reanalyzeButton.className = 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface/50 text-accent hover:bg-accent-subtle-bg transition';
    reanalyzeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691V6.168" /></svg>`;
    reanalyzeButton.title = 'Re-analyze sentence';
    sentenceControls.appendChild(reanalyzeButton);

    const translationToggleButton = document.createElement('button');
    translationToggleButton.id = 'toggle-translation-button';
    translationToggleButton.className = 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface/50 text-accent hover:bg-accent-subtle-bg transition align-middle';
    translationToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.108m-4.287 5.575a48.567 48.567 0 01-2.536-4.488M6.375 11.25a48.567 48.567 0 01-2.536-4.488" /></svg>`;
    translationToggleButton.title = 'Toggle Translation (T)';
    translationToggleButton.setAttribute('aria-pressed', 'false');
    sentenceControls.appendChild(translationToggleButton);

    const ttsButton = document.createElement('button');
    ttsButton.className = 'tts-button inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface/50 text-accent hover:bg-accent-subtle-bg transition';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"></path></svg>`;
    ttsButton.title = 'Read sentence aloud (S)';
    ttsButton.onclick = (e) => { e.preventDefault(); speakText(analysisData.original_japanese_sentence); };
    sentenceControls.appendChild(ttsButton);

    // Add translation content (hidden by default)
    if (analysisData.english_translation) {
      const translationContent = document.createElement('div');
      translationContent.id = 'sentence-translation-content';
      translationContent.className = 'hidden mt-2 pt-2 border-t border-dashed border-border-subtle text-base italic text-text-secondary';
      translationContent.innerHTML = `<p>${analysisData.english_translation}</p>`;
      sentenceWrapper.appendChild(translationContent);
    }
    
    // 2. Scrollable content area
    const scrollableContent = document.createElement('main');
    scrollableContent.id = 'reading-mode-content-wrapper';
    dom.readingModeView.appendChild(scrollableContent);

    const innerScrollable = document.createElement('div');
    innerScrollable.className = 'max-w-4xl mx-auto p-2 md:p-4';
    scrollableContent.appendChild(innerScrollable);

    // 3. Populate scrollable content (grammar notes)
    if (analysisData.grammar_patterns?.length > 0) {
        const notesContainer = document.createElement('div');
        const notesList = document.createElement('ul');
        notesList.className = 'flex flex-col gap-3';

        const segmentPatterns = new Map<number, any[]>();

        analysisData.grammar_patterns.forEach((pattern: any, i: number) => {
            const colorIndex = i % 12;
            const idClass = `pattern-${colorIndex}`;
            const patternInfo = { name: pattern.pattern_name, explanation: pattern.explanation, idClass, colorIndex };

            pattern.constituent_indices?.forEach((index: number) => {
                if (!segmentPatterns.has(index)) segmentPatterns.set(index, []);
                segmentPatterns.get(index)!.push(patternInfo);
            });

            const listItem = document.createElement('li');
            listItem.className = 'flex gap-4 p-4 rounded-lg bg-surface-subtle cursor-pointer transition-all duration-200';
            listItem.dataset.patternId = idClass;
            listItem.innerHTML = `
                <span class="flex-shrink-0 w-1.5 rounded-full bg-pattern-${colorIndex}"></span>
                <div class="flex-grow">
                    <strong class="font-semibold text-accent">${pattern.pattern_name}</strong>
                    <p class="text-sm text-text-muted mt-1">${pattern.explanation}</p>
                    <button class="show-examples-button mt-3 text-xs font-semibold px-2 py-1 rounded-md border border-accent text-accent hover:bg-accent hover:text-primary-text transition inline-flex items-center gap-2 disabled:opacity-50" data-pattern-name="${pattern.pattern_name}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                        <span class="button-text">Examples</span>
                    </button>
                </div>`;
            notesList.appendChild(listItem);
        });

        segmentPatterns.forEach((patterns, index) => {
            const el = segmentElements[index];
            if (el && patterns.length > 0) {
                el.dataset.patterns = JSON.stringify(patterns.map(({name, explanation, idClass}) => ({name, explanation, idClass})));
                const lineThickness = 2;
                const lineGap = 3;
                el.style.paddingBottom = `${4 + (patterns.length * lineThickness) + ((patterns.length - 1) * lineGap)}px`;
                const backgrounds = patterns.map(p => `linear-gradient(to top, rgb(var(--color-${p.idClass}-rgb)) 0%, rgb(var(--color-${p.idClass}-rgb)) 100%)`);
                el.style.backgroundImage = backgrounds.join(', ');
                el.style.backgroundSize = patterns.map(() => `100% ${lineThickness}px`).join(', ');
                el.style.backgroundPosition = patterns.map((_, i) => `0 calc(100% - ${i * (lineThickness + lineGap)}px)`).join(', ');
                el.style.backgroundRepeat = 'no-repeat';
                el.classList.add('grammar-pattern', ...patterns.map(p => p.idClass));
            }
        });

        notesContainer.appendChild(notesList);
        const hint = document.createElement('p');
        hint.className = 'text-xs text-center text-text-muted mt-4 px-4';
        hint.innerHTML = 'Tip: Use <kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">J</kbd>/<kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">K</kbd> to navigate patterns, <kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">E</kbd> for examples, and <kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">Esc</kbd> to clear focus.';
        notesContainer.appendChild(hint);
        innerScrollable.appendChild(notesContainer);
    }

    // 4. Set padding on scrollable content to avoid being obscured by the fixed header
    const setPadding = () => {
        const headerHeight = fixedHeader.offsetHeight;
        if (headerHeight > 0) {
          scrollableContent.style.paddingTop = `${headerHeight}px`;
        }
    };
    const resizeObserver = new ResizeObserver(setPadding);
    resizeObserver.observe(fixedHeader);
    setPadding(); // Initial call
}

/** Renders a loading state for the reading mode, including sentence preview. */
export function renderReadingModeLoading(entry: state.TextEntry, sentenceIndex: number) {
    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！]+(?:[。？！][」』]*)?/g)?.filter(s => s?.trim()) || []);
    const sentence = sentences[sentenceIndex];
    const totalSentences = sentences.length;

    dom.readingModeView.innerHTML = '';
    dom.readingModeView.className = '';

    // 1. Fixed Header
    const fixedHeader = document.createElement('header');
    fixedHeader.id = 'reading-mode-header';
    fixedHeader.className = 'fixed top-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-md shadow-sm header-collapsed';
    dom.readingModeView.appendChild(fixedHeader);

    // New hover trigger for desktop
    const hoverTrigger = document.createElement('div');
    hoverTrigger.id = 'reading-header-hover-trigger';
    hoverTrigger.className = 'hidden md:block absolute top-0 left-0 right-0 h-4 z-20';
    fixedHeader.appendChild(hoverTrigger);

    const headerContentWrapper = document.createElement('div');
    headerContentWrapper.id = 'reading-mode-content-container';
    headerContentWrapper.className = 'max-w-4xl mx-auto p-2 space-y-2';
    fixedHeader.appendChild(headerContentWrapper);
    
    // Wrapper for collapsible nav
    const navWrapper = document.createElement('div');
    navWrapper.id = 'reading-mode-nav-wrapper';
    headerContentWrapper.appendChild(navWrapper);

    // 1a. Navigation controls (now inside wrapper, Next button disabled during load)
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
            <button id="reading-nav-next" title="Next Sentence (→)" class="p-2 rounded-full hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    `;
    navWrapper.appendChild(navControls);

    // 1b. Placeholder for sentence
    const sentenceWrapper = document.createElement('div');
    sentenceWrapper.className = 'relative p-3 bg-surface-soft rounded-lg max-h-[50vh] overflow-y-auto';
    headerContentWrapper.appendChild(sentenceWrapper);

    const toggleButton = document.createElement('button');
    toggleButton.id = 'reading-header-toggle';
    toggleButton.title = 'Toggle navigation controls';
    toggleButton.className = 'md:hidden absolute top-2 right-2 z-10 p-2 rounded-full bg-surface/50 hover:bg-surface-hover';
    toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>`;
    sentenceWrapper.appendChild(toggleButton);

    const sentenceTextWrapper = document.createElement('div');
    sentenceTextWrapper.className = 'flex-grow flex items-center gap-4 text-xl font-medium font-japanese text-text-muted pr-10';
    sentenceWrapper.appendChild(sentenceTextWrapper);
    
    const sentenceText = document.createElement('p');
    sentenceText.className = 'flex-grow';
    sentenceText.textContent = sentence;

    const spinner = document.createElement('div');
    spinner.className = 'animate-spin rounded-full h-5 w-5 border-b-2 border-accent flex-shrink-0';
    
    sentenceTextWrapper.append(sentenceText, spinner);
    
    // 2. Scrollable content
    const scrollableContent = document.createElement('main');
    scrollableContent.id = 'reading-mode-content-wrapper';
    dom.readingModeView.appendChild(scrollableContent);

    const innerScrollable = document.createElement('div');
    innerScrollable.className = 'max-w-4xl mx-auto p-6 text-center text-text-muted';
    innerScrollable.textContent = 'Fetching analysis and grammar notes...';
    scrollableContent.appendChild(innerScrollable);

    // 3. Set padding dynamically
    const setPadding = () => {
        const headerHeight = fixedHeader.offsetHeight - 40;
        if (headerHeight > 0) {
            scrollableContent.style.paddingTop = `${headerHeight}px`;
        }
    };
    const resizeObserver = new ResizeObserver(setPadding);
    resizeObserver.observe(fixedHeader);
    setPadding();
}