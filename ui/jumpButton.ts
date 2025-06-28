// ui/jumpButton.ts
import * as dom from '../dom.ts';
import * as state from '../state.ts';

/** Creates the floating jump button if it doesn't exist. */
export function ensureJumpButtonExists() {
  if (!state.jumpToSentenceButton) {
    const button = document.createElement('button');
    button.className = 'fixed bottom-5 right-5 w-12 h-12 bg-sky-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold opacity-0 invisible transform translate-y-5 transition-all duration-300 hover:bg-sky-700 z-50';
    button.innerHTML = '&#8679;';
    button.title = 'Back to analyzed sentence';
    document.body.appendChild(button);
    state.setJumpButton(button);
  }
}

/** Sets up the floating "jump back to sentence" button for the main reader view. */
export function setupJumpButtonAndObserver() {
  const selectedSentence = dom.readerView.querySelector<HTMLElement>('.clickable-sentence.selected');
  
  // The button's existence is tied to having a selected sentence in the reader view.
  if (!selectedSentence) return;

  ensureJumpButtonExists();
  
  if(state.jumpToSentenceButton) {
      state.jumpToSentenceButton.onclick = () => selectedSentence.scrollIntoView({ behavior: 'smooth', block: 'center' });
      state.jumpToSentenceButton.title = 'Back to analyzed sentence';
  }

  if (state.analysisHeaderObserver) state.analysisHeaderObserver.disconnect();
  
  // The button should appear when the reader view (containing the source text) scrolls out of view.
  const observer = new IntersectionObserver(([entry]) => {
      // Show the button when the reader view is NOT intersecting (i.e., scrolled past).
      state.jumpToSentenceButton?.classList.toggle('opacity-0', entry.isIntersecting);
      state.jumpToSentenceButton?.classList.toggle('invisible', entry.isIntersecting);
      state.jumpToSentenceButton?.classList.toggle('translate-y-5', entry.isIntersecting);
  }, { root: null, threshold: 0.1 });

  // Observe the entire reader view block.
  observer.observe(dom.readerView);
  state.setAnalysisHeaderObserver(observer);
}
