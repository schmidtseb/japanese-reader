// ui/components.ts

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