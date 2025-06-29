// ui/render/analysis.ts
import { speakText } from '../../services/tts.ts';
import { getCategoryClass, createPitchAccentVisualizer, createFuriganaHTML } from '../components.ts';

/** Renders a placeholder in the analysis view while waiting for the API response. */
export function renderAnalysisPlaceholder(container: HTMLElement, sentence: string, options: { stickyTopClass?: string } = {}) {
    const { stickyTopClass = 'top-0' } = options;
    container.innerHTML = '';
    
    const stickyHeaderWrapper = document.createElement('div');
    stickyHeaderWrapper.className = `sticky ${stickyTopClass} z-10 bg-surface pt-2 rounded-b-lg`;
    container.appendChild(stickyHeaderWrapper);

    const sentenceWrapper = document.createElement('div');
    sentenceWrapper.className = 'p-4 bg-surface-soft rounded-lg';
    
    const sentenceContainer = document.createElement('div');
    sentenceContainer.className = 'flex items-center gap-4 text-2xl';

    const sentenceText = document.createElement('p');
    sentenceText.className = 'flex-grow text-text-muted font-japanese font-medium';
    sentenceText.textContent = sentence;

    const spinner = document.createElement('div');
    spinner.className = 'animate-spin rounded-full h-5 w-5 border-b-2 border-accent flex-shrink-0';

    sentenceContainer.append(sentenceText, spinner);
    sentenceWrapper.appendChild(sentenceContainer);
    stickyHeaderWrapper.appendChild(sentenceWrapper);

    const scrollingContent = document.createElement('div');
    scrollingContent.className = 'px-4 pt-14 md:pt-8 pb-4 text-center text-text-muted';
    scrollingContent.textContent = 'Fetching analysis and grammar notes...';
    container.appendChild(scrollingContent);
}


/** Renders the analysis for a single sentence. */
export function renderSingleAnalysis(container: HTMLElement, data: any, options: { stickyTopClass?: string } = {}) {
  const { stickyTopClass = 'top-0' } = options;
  container.innerHTML = '';
  const segmentElements: HTMLElement[] = [];

  // Create a wrapper for the sticky header content
  const stickyHeaderWrapper = document.createElement('div');
  stickyHeaderWrapper.className = `sticky ${stickyTopClass} z-10 bg-surface transition-colors duration-300 pt-2 rounded-b-lg`;
  container.appendChild(stickyHeaderWrapper);

  // Create a container for the content that will scroll
  const scrollingContent = document.createElement('div');
  scrollingContent.className = 'px-4 pt-14 md:pt-8 pb-4'; // Add horizontal, top and bottom padding for scrolling content
  container.appendChild(scrollingContent);

  // Interactive Sentence & TTS Button
  if (data.analysis?.length > 0) {
    const sentenceWrapper = document.createElement('div');
    sentenceWrapper.className = 'p-4 bg-surface-soft rounded-lg max-h-[50vh] overflow-y-auto';
    
    const sentenceContainer = document.createElement('div');
    sentenceContainer.className = 'flex-grow flex flex-wrap items-center gap-x-1.5 gap-y-1 text-2xl';
    
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
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'flex items-center gap-1.5 ml-2 self-center';

    const reanalyzeButton = document.createElement('button');
    reanalyzeButton.id = 're-analyze-button';
    reanalyzeButton.className = 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface text-accent hover:bg-accent-subtle-bg transition align-middle';
    reanalyzeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691V6.168" /></svg>`;
    reanalyzeButton.title = 'Re-analyze sentence';

    const ttsButton = document.createElement('button');
    ttsButton.className = 'tts-button inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface text-accent hover:bg-accent-subtle-bg transition align-middle';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"></path></svg>`;
    ttsButton.title = 'Read sentence aloud (S)';
    ttsButton.onclick = (e) => { e.preventDefault(); speakText(data.original_japanese_sentence); };
    
    const ttsKbd = document.createElement('kbd');
    ttsKbd.className = 'hidden sm:inline font-sans text-xs font-semibold text-text-muted border border-strong rounded px-1.5 py-0.5';
    ttsKbd.textContent = 'S';
    
    controlsContainer.append(reanalyzeButton, ttsButton, ttsKbd);
    sentenceContainer.appendChild(controlsContainer);
    sentenceWrapper.appendChild(sentenceContainer);
    stickyHeaderWrapper.appendChild(sentenceWrapper);
  }

  // English Translation
  if (data.english_translation) {
      const translationContainer = document.createElement('div');
      
      const translationWrapper = document.createElement('div');
      translationWrapper.className = 'bg-surface-subtle p-4 rounded-lg';

      const translationHeader = document.createElement('div');
      translationHeader.className = 'flex justify-between items-center';
      
      const title = document.createElement('h3');
      title.className = 'text-base font-semibold text-text-secondary';
      title.textContent = 'English Translation';

      const toggleButton = document.createElement('button');
      toggleButton.id = 'toggle-translation-button';
      toggleButton.className = 'text-xs font-semibold px-2 py-1 rounded-md border border-strong text-text-muted hover:bg-surface-hover transition inline-flex items-center gap-1.5';
      toggleButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          <span class="button-text">Show</span>
          <kbd class="ml-1 font-sans text-xs font-semibold text-text-muted border border-strong rounded px-1.5 py-0.5">T</kbd>
      `;
      toggleButton.setAttribute('aria-controls', 'translation-content');
      toggleButton.setAttribute('aria-expanded', 'false');
      toggleButton.title = 'Toggle translation visibility (Hotkey: T)';

      translationHeader.append(title, toggleButton);

      const translationContent = document.createElement('div');
      translationContent.id = 'translation-content';
      translationContent.className = 'hidden mt-3 pt-3 border-t border-dashed border-border-subtle';
      translationContent.innerHTML = `<p class="text-base italic text-text-secondary">${data.english_translation}</p>`;
      
      translationWrapper.append(translationHeader, translationContent);
      translationContainer.appendChild(translationWrapper);
      scrollingContent.appendChild(translationContainer);
  }

  // Grammar Notes
  if (data.grammar_patterns?.length > 0) {
    const notesContainer = document.createElement('div');
    notesContainer.className = 'mt-6';
    notesContainer.innerHTML = '<h3 class="text-base font-semibold border-b border-border-subtle pb-2 mb-3 text-text-primary">Grammar & Vocabulary Notes</h3>';
    const notesList = document.createElement('ul');
    notesList.className = 'flex flex-col gap-3';

    const segmentPatterns = new Map<number, any[]>();

    data.grammar_patterns.forEach((pattern: any, i: number) => {
      const colorIndex = i % 12; // 12 pattern colors defined
      const idClass = `pattern-${colorIndex}`;
      const patternInfo = { 
          name: pattern.pattern_name, 
          explanation: pattern.explanation, 
          idClass: idClass,
          colorIndex: colorIndex,
      };

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
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span class="button-text">Examples</span>
              </button>
          </div>
      `;
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
    
    // Add hotkey hint
    const hint = document.createElement('p');
    hint.className = 'text-xs text-center text-text-muted mt-4 px-4';
    hint.innerHTML = 'Tip: Use <kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">J</kbd>/<kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">K</kbd> to navigate patterns, <kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">E</kbd> for examples, and <kbd class="font-sans border rounded px-1.5 py-0.5 border-strong">Esc</kbd> to clear focus.';
    notesContainer.appendChild(hint);

    scrollingContent.appendChild(notesContainer);
  }
}