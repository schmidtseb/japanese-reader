// ui/render/analysis.ts
import { PATTERN_COLORS } from '../../constants.ts';
import { speakText } from '../../services/tts.ts';
import { getCategoryClass, createPitchAccentVisualizer, createFuriganaHTML } from '../components.ts';

/** Renders the analysis for a single sentence. */
export function renderSingleAnalysis(container: HTMLElement, data: any, options: { stickyTopClass?: string } = {}) {
  const { stickyTopClass = 'top-0' } = options;
  container.innerHTML = '';
  const segmentElements: HTMLElement[] = [];

  // Create a wrapper for the sticky header content
  const stickyHeaderWrapper = document.createElement('div');
  stickyHeaderWrapper.className = `sticky ${stickyTopClass} z-10 bg-white dark:bg-neutral-900 transition-colors duration-300 py-4 shadow-md dark:shadow-neutral-800/50`;
  container.appendChild(stickyHeaderWrapper);

  // Create a container for the content that will scroll
  const scrollingContent = document.createElement('div');
  scrollingContent.className = 'pt-6 px-4 pb-4'; // Add horizontal and bottom padding for scrolling content
  container.appendChild(scrollingContent);

  // Header
  if (data.original_japanese_sentence) {
    const header = document.createElement('div');
    header.className = 'p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg flex justify-between items-center gap-4';
    header.id = 'current-analysis-header';
    
    const sentenceTextSpan = document.createElement('span');
    sentenceTextSpan.className = 'text-lg font-semibold text-sky-700 dark:text-sky-400';
    sentenceTextSpan.textContent = data.original_japanese_sentence;
    
    const ttsButton = document.createElement('button');
    ttsButton.className = 'tts-button flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-600 dark:hover:text-white transition';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"></path></svg>`;
    ttsButton.title = 'Read sentence aloud';
    ttsButton.onclick = (e) => { e.preventDefault(); speakText(data.original_japanese_sentence); };
    
    header.append(sentenceTextSpan, ttsButton);
    stickyHeaderWrapper.appendChild(header);
  }

  // Interactive Sentence
  if (data.analysis?.length > 0) {
    const sentenceContainer = document.createElement('div');
    sentenceContainer.className = 'flex flex-wrap gap-x-1.5 gap-y-1 text-2xl p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg mt-4';
    
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
    translationContainer.innerHTML = `<h3 class="text-base font-semibold border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-3">English Translation</h3><p class="text-base italic text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">${data.english_translation}</p>`;
    scrollingContent.appendChild(translationContainer);
  }

  // Grammar Notes
  if (data.grammar_patterns?.length > 0) {
    const notesContainer = document.createElement('div');
    notesContainer.className = 'mt-6';
    notesContainer.innerHTML = '<h3 class="text-base font-semibold border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-3">Grammar & Vocabulary Notes</h3>';
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
      listItem.className = 'flex gap-4 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 cursor-pointer transition-all duration-200';
      listItem.dataset.patternId = idClass;
      listItem.innerHTML = `
          <span class="flex-shrink-0 w-1.5 rounded-full bg-pattern-${colorIndex}"></span>
          <div class="flex-grow">
              <strong class="font-semibold text-sky-700 dark:text-sky-400">${pattern.pattern_name}</strong>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">${pattern.explanation}</p>
              <button class="show-examples-button mt-3 text-xs font-semibold px-2 py-1 rounded-md border border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white dark:hover:text-neutral-900 transition inline-flex items-center gap-2 disabled:opacity-50" data-pattern-name="${pattern.pattern_name}">
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