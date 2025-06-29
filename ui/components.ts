// ui/components.ts

/** Maps a grammatical category from the API to a Tailwind CSS class. */
export function getCategoryClass(category: string): string {
  const cat = (category || 'unknown').split(/[-_]/)[0].toLowerCase();
  const classMap: { [key: string]: string } = {
    noun: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
    verb: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200',
    particle: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    adjective: 'bg-violet-100 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200',
    adverb: 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200',
    auxiliary: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200',
    grammatical: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200',
    conjunction: 'bg-fuchsia-100 dark:bg-fuchsia-900/60 text-fuchsia-800 dark:text-fuchsia-200',
    punctuation: 'bg-transparent',
    unknown: 'bg-neutral-100 dark:bg-neutral-700'
  };
  return classMap[cat] || classMap.unknown;
}

/** Creates an HTML string with interactive Kanji links. */
export function createInteractiveText(text: string): string {
    return text.split('').map(char => {
        if (/[一-龯]/.test(char)) { 
            return `<a href="https://jisho.org/search/${encodeURIComponent(char)}%20%23kanji" target="_blank" rel="noopener noreferrer" class="underline decoration-neutral-400/50 decoration-1 underline-offset-2 hover:text-sky-500 hover:decoration-sky-500 transition">${char}</a>`;
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
      html += (kanjiReading && kanjiReading !== part) ? `<ruby>${finalBasePart}<rt class="text-xs text-neutral-500 select-none">${kanjiReading}</rt></ruby>` : finalBasePart;
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
        polyline.setAttribute('class', 'fill-none stroke-neutral-500 dark:stroke-neutral-400');
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
        circle.setAttribute('class', 'fill-neutral-500 dark:fill-neutral-400');
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
    <div role="alert" class="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 rounded-r-lg shadow-md my-4 transition-all duration-300">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-500 dark:text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-semibold text-red-800 dark:text-red-200">${message}</p>
          ${detail ? `<div class="mt-2 text-sm text-red-700 dark:text-red-300"><p>${detail}</p></div>` : ''}
        </div>
      </div>
    </div>
  `;
}