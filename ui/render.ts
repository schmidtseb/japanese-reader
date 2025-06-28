// ui/render.ts
import * as dom from '../dom.ts';
import * as state from '../state.ts';
import { PATTERN_COLORS } from '../constants.ts';
import { speakText } from '../services/tts.ts';
import { getCategoryClass, createPitchAccentVisualizer, createFuriganaHTML } from './components.ts';

/** Renders the analysis for a single sentence. */
export function renderSingleAnalysis(container: HTMLElement, data: any, options: { stickyTopClass?: string } = {}) {
  const { stickyTopClass = 'top-0' } = options;
  container.innerHTML = '';
  const segmentElements: HTMLElement[] = [];

  // Create a wrapper for the sticky header content
  const stickyHeaderWrapper = document.createElement('div');
  stickyHeaderWrapper.className = `sticky ${stickyTopClass} z-10 bg-white dark:bg-slate-800 transition-colors duration-300 py-4 shadow-md dark:shadow-slate-700/50`;
  container.appendChild(stickyHeaderWrapper);

  // Create a container for the content that will scroll
  const scrollingContent = document.createElement('div');
  scrollingContent.className = 'pt-6 px-4 pb-4'; // Add horizontal and bottom padding for scrolling content
  container.appendChild(scrollingContent);

  // Header
  if (data.original_japanese_sentence) {
    const header = document.createElement('div');
    header.className = 'p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex justify-between items-center gap-4';
    header.id = 'current-analysis-header';
    
    const sentenceTextSpan = document.createElement('span');
    sentenceTextSpan.className = 'text-lg font-semibold text-sky-700 dark:text-sky-400';
    sentenceTextSpan.textContent = data.original_japanese_sentence;
    
    const ttsButton = document.createElement('button');
    ttsButton.className = 'tts-button flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-600 dark:hover:text-white transition';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"></path></svg>`;
    ttsButton.title = 'Read sentence aloud';
    ttsButton.onclick = (e) => { e.preventDefault(); speakText(data.original_japanese_sentence); };
    
    header.append(sentenceTextSpan, ttsButton);
    stickyHeaderWrapper.appendChild(header);
  }

  // Interactive Sentence
  if (data.analysis?.length > 0) {
    const sentenceContainer = document.createElement('div');
    sentenceContainer.className = 'flex flex-wrap gap-x-1.5 gap-y-1 text-2xl p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg mt-4';
    
    data.analysis.forEach((segment: any) => {
        const segmentEl = document.createElement('span');
        segmentEl.className = `segment relative inline-block rounded-md px-2 py-1 cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 leading-loose ${getCategoryClass(segment.category)}`;
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
    stickyHeaderWrapper.appendChild(sentenceContainer);
  }

  // English Translation
  if (data.english_translation) {
    const translationContainer = document.createElement('div');
    translationContainer.innerHTML = `<h3 class="text-base font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">English Translation</h3><p class="text-base italic text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg">${data.english_translation}</p>`;
    scrollingContent.appendChild(translationContainer);
  }

  // Grammar Notes
  if (data.grammar_patterns?.length > 0) {
    const notesContainer = document.createElement('div');
    notesContainer.className = 'mt-6';
    notesContainer.innerHTML = '<h3 class="text-base font-semibold border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">Grammar & Vocabulary Notes</h3>';
    const notesList = document.createElement('ul');
    notesList.className = 'flex flex-col gap-3';

    const segmentPatterns = new Map<number, any[]>();
    const isDarkMode = document.documentElement.classList.contains('dark');

    data.grammar_patterns.forEach((pattern: any, i: number) => {
      const colorIndex = i % PATTERN_COLORS.length;
      const idClass = `p-${colorIndex}`;
      const patternInfo = { 
          name: pattern.pattern_name, 
          explanation: pattern.explanation, 
          colorClass: `bg-pattern-${colorIndex}`,
          idClass: idClass,
          underlineColor: isDarkMode ? PATTERN_COLORS[colorIndex].dark : PATTERN_COLORS[colorIndex].light
      };

      pattern.constituent_indices?.forEach((index: number) => {
          if (!segmentPatterns.has(index)) segmentPatterns.set(index, []);
          segmentPatterns.get(index)!.push(patternInfo);
      });

      const listItem = document.createElement('li');
      listItem.className = 'flex gap-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-900/50 cursor-pointer transition-all duration-200';
      listItem.dataset.patternId = idClass;
      listItem.innerHTML = `
          <span class="flex-shrink-0 w-1.5 rounded-full bg-pattern-${colorIndex}"></span>
          <div class="flex-grow">
              <strong class="font-semibold text-sky-700 dark:text-sky-400">${pattern.pattern_name}</strong>
              <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">${pattern.explanation}</p>
              <button class="show-examples-button mt-3 text-xs font-semibold px-2 py-1 rounded-md border border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white dark:hover:text-slate-900 transition inline-flex items-center gap-2 disabled:opacity-50" data-pattern-name="${pattern.pattern_name}">Show Examples</button>
          </div>
      `;
      notesList.appendChild(listItem);
    });

    segmentPatterns.forEach((patterns, index) => {
      const el = segmentElements[index];
      if (el && patterns.length > 0) {
        el.classList.add('grammar-pattern', ...patterns.map(p => p.idClass));
        el.dataset.patterns = JSON.stringify(patterns.map(({name, explanation, colorClass}) => ({name, explanation, colorClass})));
        
        const lineThickness = 2;
        const lineGap = 3;
        el.style.paddingBottom = `${4 + (patterns.length * lineThickness) + ((patterns.length - 1) * lineGap)}px`;
        const backgrounds = patterns.map(p => `linear-gradient(to top, ${p.underlineColor} 0%, ${p.underlineColor} 100%)`);
        el.style.backgroundImage = backgrounds.join(', ');
        el.style.backgroundSize = patterns.map(() => `100% ${lineThickness}px`).join(', ');
        el.style.backgroundPosition = patterns.map((_, i) => `0 calc(100% - ${i * (lineThickness + lineGap)}px)`).join(', ');
        el.style.backgroundRepeat = 'no-repeat';
      }
    });

    notesContainer.appendChild(notesList);
    scrollingContent.appendChild(notesContainer);
  }
}

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
    header.innerHTML = `<h2 class="text-xl font-bold text-slate-800 dark:text-slate-200">Text Content</h2>`;

    if (allSentences.length > 0) {
        const startReadingButton = document.createElement('button');
        startReadingButton.id = 'start-reading-button';
        startReadingButton.className = 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:bg-sky-500 dark:hover:bg-sky-600 dark:text-slate-900 dark:font-semibold';
        startReadingButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>Start Reading`;
        header.appendChild(startReadingButton);
    }
    viewContainer.appendChild(header);
    
    const textContainer = document.createElement('div');
    textContainer.className = 'bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 sm:p-6 max-h-80 overflow-y-auto';
    
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
    dom.readingModeView.innerHTML = ''; // Clear previous reading mode content
    // By making this a simple block container, the main page will scroll,
    // allowing the sticky elements within to correctly anchor to the viewport.
    dom.readingModeView.className = '';

    const sentences = entry.text.split('\n').flatMap(p => p.match(/[^。？！\s]+[。？！]?/g)?.filter(s => s?.trim()) || []);
    const totalSentences = sentences.length;

    // 1. Navigation Header - STICKY
    const navHeader = document.createElement('header');
    navHeader.className = 'sticky top-0 z-20 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors duration-300';
    navHeader.innerHTML = `
        <button id="reading-mode-exit" title="Exit Reading Mode" class="px-3 py-1.5 text-sm rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Exit</button>
        <div class="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <input type="number" id="reading-mode-sentence-input" value="${sentenceIndex + 1}" min="1" max="${totalSentences}" title="Enter sentence number and press Enter" class="w-12 text-center bg-slate-100 dark:bg-slate-700 rounded-md p-1 focus:ring-2 focus:ring-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
            <span>/ ${totalSentences}</span>
        </div>
        <div class="flex items-center gap-2">
            <button id="reading-nav-prev" title="Previous Sentence" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed" ${sentenceIndex === 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button id="reading-nav-next" title="Next Sentence" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed" ${sentenceIndex >= totalSentences - 1 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    `;
    dom.readingModeView.appendChild(navHeader);

    // 2. Analysis Container
    const analysisContainer = document.createElement('div');
    // The nav header's height is roughly 4.5rem (72px) plus a 1px border.
    // We use this value to offset the sticky position of the analysis header below it.
    renderSingleAnalysis(analysisContainer, analysisData, { stickyTopClass: 'top-[4.5625rem]' });
    dom.readingModeView.appendChild(analysisContainer);
}

/** Renders a loading state for the reading mode. */
export function renderReadingModeLoading(message: string = 'Loading analysis...') {
    dom.readingModeView.innerHTML = `
        <div class="flex flex-col items-center justify-center p-16 text-slate-500">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 mb-4"></div>
            <p>${message}</p>
        </div>
    `;
}

/** Displays an error message. */
export function showError(message: string, container: 'main' | 'analysis' = 'main') {
    const errorHtml = `<p class="text-center text-red-600 dark:text-red-400 font-medium p-4">${message}</p>`;
    if (container === 'analysis') {
        dom.analysisView.innerHTML = errorHtml;
    } else {
        dom.mainView.classList.remove('hidden');
        dom.readingModeView.classList.add('hidden');
        dom.readerView.innerHTML = errorHtml;
        dom.analysisView.innerHTML = '';
    }
}

/** Renders the history list into the history panel. */
export function renderHistoryPanel() {
    dom.historyList.innerHTML = '';
    const history = state.textHistory;

    dom.historyEmptyMessage.classList.toggle('hidden', history.length > 0);
    dom.clearHistoryButton.classList.toggle('hidden', history.length === 0);

    history.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'text-entry-item group p-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center';

        const textContainer = document.createElement('div');
        textContainer.className = 'flex-grow pr-4 truncate';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'font-medium text-sm cursor-pointer';
        titleSpan.textContent = entry.title;
        titleSpan.title = entry.title;
        titleSpan.dataset.action = 'load';
        titleSpan.dataset.entryId = entry.id;
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'block text-xs text-slate-500 dark:text-slate-400 mt-1';
        dateSpan.textContent = `Updated: ${new Date(entry.updatedAt).toLocaleString()}`;
        
        textContainer.append(titleSpan, dateSpan);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0';
        
        const loadButton = document.createElement('button');
        loadButton.className = 'p-1.5 rounded-md hover:bg-sky-100 dark:hover:bg-sky-600';
        loadButton.title = 'Load Text';
        loadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>`;
        loadButton.dataset.action = 'load';
        loadButton.dataset.entryId = entry.id;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-600';
        deleteButton.title = 'Delete Text';
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
        deleteButton.dataset.action = 'delete';
        deleteButton.dataset.entryId = entry.id;

        buttonContainer.append(loadButton, deleteButton);
        li.append(textContainer, buttonContainer);
        dom.historyList.appendChild(li);
    });
}