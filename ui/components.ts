// ui/components.ts

/** Maps a grammatical category from the API to a Tailwind CSS class. */
export function getCategoryClass(category: string): string {
  const cat = (category || 'unknown').split(/[-_]/)[0].toLowerCase();
  const classMap: { [key: string]: string } = {
    noun: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
    verb: 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200',
    particle: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
    adjective: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
    adverb: 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200',
    auxiliary: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200',
    grammatical: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200',
    conjunction: 'bg-pink-100 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200',
    punctuation: 'bg-transparent',
    unknown: 'bg-slate-100 dark:bg-slate-700'
  };
  return classMap[cat] || classMap.unknown;
}

/** Creates an HTML string with interactive Kanji links. */
export function createInteractiveText(text: string): string {
    return text.split('').map(char => {
        if (/[一-龯]/.test(char)) { 
            return `<a href="https://jisho.org/search/${encodeURIComponent(char)}%20%23kanji" target="_blank" rel="noopener noreferrer" class="underline decoration-slate-400/50 decoration-1 underline-offset-2 hover:text-sky-500 hover:decoration-sky-500 transition">${char}</a>`;
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
      html += (kanjiReading && kanjiReading !== part) ? `<ruby>${finalBasePart}<rt class="text-xs text-slate-500 select-none">${kanjiReading}</rt></ruby>` : finalBasePart;
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
        polyline.setAttribute('class', 'fill-none stroke-slate-500 dark:stroke-slate-400');
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
        circle.setAttribute('class', 'fill-slate-500 dark:fill-slate-400');
        svg.appendChild(circle);
    });

    svg.setAttribute('viewBox', '0 0 100 10');
    svg.setAttribute('preserveAspectRatio', 'none');
    return svg;
}
