// ui/components.ts
import { speakText } from '../services/tts.ts';

/** Maps a grammatical category from the API to a Tailwind CSS class. */
export function getCategoryClass(category: string): string {
  const cat = (category || 'unknown').split(/[-_]/)[0].toLowerCase();
  const classMap: { [key: string]: string } = {
    noun: 'bg-pos-noun-bg text-pos-noun-text',
    verb: 'bg-pos-verb-bg text-pos-verb-text',
    particle: 'bg-pos-particle-bg text-pos-particle-text',
    adjective: 'bg-pos-adjective-bg text-pos-adjective-text',
    adverb: 'bg-pos-adverb-bg text-pos-adverb-text',
    auxiliary: 'bg-pos-auxiliary-bg text-pos-auxiliary-text',
    grammatical: 'bg-pos-auxiliary-bg text-pos-auxiliary-text',
    conjunction: 'bg-pos-conjunction-bg text-pos-conjunction-text',
    suffix: 'bg-pos-suffix-bg text-pos-suffix-text',
    punctuation: 'bg-transparent',
    unknown: 'bg-surface-soft'
  };
  return classMap[cat] || classMap.unknown;
}

/** Creates an HTML string with interactive Kanji links. */
export function createInteractiveText(text: string): string {
    return text.split('').map(char => {
        if (/[一-龯]/.test(char)) { 
            return `<a href="https://jisho.org/search/${encodeURIComponent(char)}%20%23kanji" target="_blank" rel="noopener noreferrer" class="underline decoration-text-muted/50 decoration-1 underline-offset-2 hover:text-accent hover:decoration-accent transition">${char}</a>`;
        }
        return char;
    }).join('');
}

/** Creates an HTML string with <ruby> tags for Japanese text. */
export function createFuriganaHTML(base: string, reading: string, createLinks: boolean): string {
  if (!reading || base === reading) return createLinks ? createInteractiveText(base) : base;

  const parts = base.match(/([一-龯]+|[^一-龯]+)/g) || [];
  let readingIndex = 0;
  let html = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isKanji = /[一-龯]/.test(part);

    if (isKanji) {
      let kanjiReading = '';
      const nextKanaPart = (i + 1 < parts.length && !/[一-龯]/.test(parts[i + 1])) ? parts[i + 1] : '';
      
      const anchorIndex = nextKanaPart ? reading.indexOf(nextKanaPart, readingIndex) : -1;
      if (anchorIndex !== -1) {
          kanjiReading = reading.substring(readingIndex, anchorIndex);
          readingIndex = anchorIndex;
      } else {
          kanjiReading = reading.substring(readingIndex);
          readingIndex = reading.length;
      }
      
      const finalBasePart = createLinks ? createInteractiveText(part) : part;
      html += (kanjiReading && kanjiReading !== part) ? `<ruby>${finalBasePart}<rt class="text-xs text-text-muted select-none">${kanjiReading}</rt></ruby>` : finalBasePart;
    } else { // Is Kana
      html += part;
      if (reading.substring(readingIndex).startsWith(part)) readingIndex += part.length;
    }
  }
  return html;
}

/** Creates an SVG element to visualize pitch accent. */
export function createPitchAccentVisualizer(reading: string, pitchAccent: string): SVGElement | null {
    if (!reading || !pitchAccent || reading.length !== pitchAccent.length) return null;
    
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'pitch-accent-svg absolute top-0 left-0 w-full h-[14px] overflow-visible pointer-events-none');
    
    const points = pitchAccent.split('').map((p, i) => ({ x: (100 / reading.length) * (i + 0.5), y: p === 'H' ? 2 : 8 }));
    
    if (points.length > 1) {
        const polyline = document.createElementNS(svgNS, 'polyline');
        polyline.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
        polyline.setAttribute('class', 'fill-none stroke-text-muted');
        polyline.setAttribute('stroke-width', '1.5');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(polyline);
    }

    points.forEach(p => {
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', String(p.x));
        circle.setAttribute('cy', String(p.y));
        circle.setAttribute('r', '1.2');
        circle.setAttribute('class', 'fill-text-muted');
        svg.appendChild(circle);
    });

    svg.setAttribute('viewBox', '0 0 100 10');
    svg.setAttribute('preserveAspectRatio', 'none');
    return svg;
}

/**
 * Creates an HTML string for a styled error message component.
 * @param message The main error message.
 * @param detail Optional secondary text for more details.
 * @returns An HTML string for the error component.
 */
export function createErrorComponent(message: string, detail?: string): string {
  return `
    <div role="alert" class="p-4 bg-destructive-subtle-bg border-l-4 border-destructive rounded-r-lg shadow-md my-4 transition-all duration-300">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-destructive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-semibold text-destructive-subtle-text">${message}</p>
          ${detail ? `<div class="mt-2 text-sm text-destructive-subtle-text/80"><p>${detail}</p></div>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Creates the interactive sentence part of the analysis view.
 * This is an internal helper for createAnalysisHeaderComponent.
 */
function createInteractiveSentenceComponent(data: any, segmentElements: HTMLElement[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    data.analysis?.forEach((segment: any) => {
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
        
        fragment.appendChild(segmentEl);
        segmentElements.push(segmentEl);
    });
    return fragment;
}

/**
 * Creates the entire sentence header component, including interactive sentence, controls, and translation.
 * @param data The analysis data object.
 * @param segmentElements An array to be populated with segment elements.
 * @param options Optional configuration for layout variations.
 * @returns The fully constructed sentence header element.
 */
export function createAnalysisHeaderComponent(data: any, segmentElements: HTMLElement[], options: {
    wrapperClasses?: string[], 
    sentenceContainerClasses?: string[],
    extraControls?: HTMLElement[]
} = {}): HTMLElement {
    const sentenceWrapper = document.createElement('div');
    sentenceWrapper.className = ['relative', 'p-4', 'bg-surface-soft', 'rounded-lg', 'min-h-36', ...(options.wrapperClasses || [])].join(' ');

    const sentenceContainer = document.createElement('div');
    sentenceContainer.className = ['flex', 'flex-wrap', 'items-center', 'gap-x-1.5', 'gap-y-1', 'text-2xl', 'max-h-[50vh]', 'overflow-y-auto', 'no-scrollbar', 'pr-8', ...(options.sentenceContainerClasses || [])].join(' ');
    
    const sentenceContent = createInteractiveSentenceComponent(data, segmentElements);
    sentenceContainer.appendChild(sentenceContent);
    sentenceWrapper.appendChild(sentenceContainer);

    // --- Controls ---
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'absolute top-4 right-4 z-10 flex flex-col gap-1.5';
    if(options.extraControls) {
        options.extraControls.forEach(ctrl => controlsContainer.prepend(ctrl));
    }

    const reanalyzeButton = document.createElement('button');
    reanalyzeButton.id = 're-analyze-button';
    reanalyzeButton.className = 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface text-accent hover:bg-accent-subtle-bg transition align-middle';
    reanalyzeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 16 16" stroke="currentColor" stroke-width="0.5"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>`;
    reanalyzeButton.title = 'Re-analyze sentence';

    const translationToggleButton = document.createElement('button');
    translationToggleButton.id = 'toggle-translation-button';
    translationToggleButton.className = 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface text-accent hover:bg-accent-subtle-bg transition align-middle';
    translationToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" stroke-width="0.3"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-translate" viewBox="0 0 16 16"><path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286zm1.634-.736L5.5 3.956h-.049l-.679 2.022z"/><path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm7.138 9.995q.289.451.63.846c-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6 6 0 0 1-.415-.492 2 2 0 0 1-.94.31"/></svg>`
    translationToggleButton.title = 'Toggle Translation (T)';
    translationToggleButton.setAttribute('aria-pressed', 'false');

    const ttsButton = document.createElement('button');
    ttsButton.className = 'tts-button inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface text-accent hover:bg-accent-subtle-bg transition align-middle';
    ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"></path></svg>`;
    ttsButton.title = 'Read sentence aloud (S)';
    ttsButton.onclick = (e) => { e.preventDefault(); speakText(data.original_japanese_sentence); };
    
    controlsContainer.append(reanalyzeButton, translationToggleButton, ttsButton);
    sentenceWrapper.appendChild(controlsContainer);

    // --- Translation Content ---
    if (data.english_translation) {
      const translationContent = document.createElement('div');
      translationContent.id = 'sentence-translation-content';
      translationContent.className = 'hidden mt-2 pt-2 border-t border-dashed border-border-subtle text-base italic text-text-secondary';
      translationContent.innerHTML = `<p>${data.english_translation}</p>`;
      sentenceWrapper.appendChild(translationContent);
    }

    return sentenceWrapper;
}


/**
 * Creates the grammar notes component, including the list and underlines on the sentence segments.
 * @param data The analysis data object.
 * @param segmentElements The array of segment elements to be modified with underlines.
 * @returns The fully constructed grammar notes container element.
 */
export function createGrammarNotesComponent(data: any, segmentElements: HTMLElement[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    if (!data.grammar_patterns || data.grammar_patterns.length === 0) {
        return fragment;
    }

    const notesContainer = document.createElement('div');
    notesContainer.className = 'mt-6';
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

    fragment.appendChild(notesContainer);
    return fragment;
}