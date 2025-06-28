// ui/render/common.ts
import * as dom from '../../dom.ts';
import { createErrorComponent } from '../components.ts';

/** Displays an error message. */
export function showError(message: string, container: 'main' | 'analysis' = 'main', detail?: string) {
    const errorHtml = createErrorComponent(message, detail);
    if (container === 'analysis') {
        dom.analysisView.innerHTML = errorHtml;
    } else {
        dom.mainView.classList.remove('hidden');
        dom.readingModeView.classList.add('hidden');
        dom.readerView.innerHTML = errorHtml;
        dom.analysisView.innerHTML = '';
    }
}
