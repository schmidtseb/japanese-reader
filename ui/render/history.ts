// ui/render/history.ts
import * as dom from '../../dom.ts';
import * as state from '../../state.ts';

/** Renders the history list into the history panel. */
export function renderHistoryPanel() {
    dom.historyList.innerHTML = '';
    const history = state.textHistory;

    dom.historyEmptyMessage.classList.toggle('hidden', history.length > 0);
    dom.clearHistoryButton.classList.toggle('hidden', history.length === 0);

    history.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'text-entry-item group p-4 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center';

        const textContainer = document.createElement('div');
        textContainer.className = 'flex-grow pr-4 truncate cursor-pointer';
        textContainer.dataset.action = 'load';
        textContainer.dataset.entryId = entry.id;
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'font-medium text-sm pointer-events-none';
        titleSpan.textContent = entry.title;
        titleSpan.title = entry.title;
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'block text-xs text-neutral-500 dark:text-neutral-400 mt-1 pointer-events-none';
        dateSpan.textContent = `Updated: ${new Date(entry.updatedAt).toLocaleString()}`;
        
        textContainer.append(titleSpan, dateSpan);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0';
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200';
        deleteButton.title = 'Delete Text';
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
        deleteButton.dataset.action = 'delete';
        deleteButton.dataset.entryId = entry.id;

        buttonContainer.append(deleteButton);
        li.append(textContainer, buttonContainer);
        dom.historyList.appendChild(li);
    });
}