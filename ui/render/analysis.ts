// ui/render/analysis.ts
import { createAnalysisHeaderComponent, createGrammarNotesComponent } from '../components.ts';

/** Renders a placeholder in the analysis view while waiting for the API response. */
export function renderAnalysisPlaceholder(container: HTMLElement, sentence: string, options: { stickyTopClass?: string } = {}) {
    const { stickyTopClass = 'top-0' } = options;
    container.innerHTML = '';
    
    const stickyHeaderWrapper = document.createElement('div');
    stickyHeaderWrapper.className = `sticky ${stickyTopClass} z-20 bg-surface pt-2 rounded-b-lg`;
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
    scrollingContent.className = 'px-4 pb-4 text-center text-text-muted';
    scrollingContent.textContent = 'Fetching analysis and grammar notes...';
    container.appendChild(scrollingContent);
}


/** Renders the analysis for a single sentence. */
export function renderSingleAnalysis(container: HTMLElement, data: any, options: { stickyTopClass?: string } = {}) {
  const { stickyTopClass = 'top-0' } = options;
  container.innerHTML = '';

  if (!data || !data.analysis) {
    // Handle cases with no data if necessary
    return;
  }
  
  const segmentElements: HTMLElement[] = [];

  // Create a wrapper for the sticky header content
  const stickyHeaderWrapper = document.createElement('div');
  stickyHeaderWrapper.className = `sticky ${stickyTopClass} z-20 bg-surface transition-colors duration-300 pt-2 rounded-b-lg`;
  container.appendChild(stickyHeaderWrapper);

  // Create a container for the content that will scroll
  const scrollingContent = document.createElement('div');
  scrollingContent.className = 'px-4 pb-4'; // Add horizontal, top and bottom padding for scrolling content
  container.appendChild(scrollingContent);

  // 1. Create the entire analysis header using the shared component
  const analysisHeader = createAnalysisHeaderComponent(data, segmentElements, {
    sentenceContainerClasses: ['text-2xl']
  });
  stickyHeaderWrapper.appendChild(analysisHeader);

  // 2. Create the grammar notes using the shared component
  const grammarNotes = createGrammarNotesComponent(data, segmentElements);
  scrollingContent.appendChild(grammarNotes);
}