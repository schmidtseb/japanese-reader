// ui/modal.ts
import * as dom from '../dom.ts';

let onConfirmCallback: (() => void) | null = null;
let onCancelCallback: (() => void) | null = null;

function hideModal() {
  dom.modalOverlay.classList.add('opacity-0', 'invisible');
  dom.modalBox.classList.add('scale-95', 'opacity-0');
  
  // Clean up callbacks to prevent accidental triggers
  onConfirmCallback = null;
  onCancelCallback = null;
}

function handleConfirm() {
  onConfirmCallback?.();
  hideModal();
}

function handleCancel() {
  onCancelCallback?.();
  hideModal();
}

/** Sets up the event listeners for the modal buttons and overlay. */
export function setupModal() {
  dom.modalConfirmButton.addEventListener('click', handleConfirm);
  dom.modalCancelButton.addEventListener('click', handleCancel);
  dom.modalOverlay.addEventListener('click', (e) => {
    // Hide modal if the click is on the overlay itself, not the box
    if (e.target === dom.modalOverlay) {
        handleCancel();
    }
  });
}

/**
 * Displays a confirmation modal with customizable text and a callback for the confirm action.
 * @param message The message to display in the modal.
 * @param onConfirm The function to execute when the confirm button is clicked.
 * @param options Optional settings for button text and styling.
 */
export function showConfirmationModal(
  message: string,
  onConfirm: () => void,
  options: { confirmText?: string; confirmClass?: string; cancelText?: string; } = {}
) {
  dom.modalMessage.textContent = message;
  onConfirmCallback = onConfirm;

  // Set up confirm button
  dom.modalConfirmButton.textContent = options.confirmText || 'Confirm';
  // Reset classes first
  dom.modalConfirmButton.className = 'px-5 py-3 rounded-xl text-base font-medium text-primary-text transition-colors shadow-lg';
  // Add new classes
  const confirmClasses = options.confirmClass?.split(' ') || ['bg-destructive', 'hover:bg-destructive-hover'];
  dom.modalConfirmButton.classList.add(...confirmClasses);
  
  // Set up cancel button
  dom.modalCancelButton.textContent = options.cancelText || 'Cancel';
  dom.modalCancelButton.classList.remove('hidden');

  // Show the modal
  dom.modalOverlay.classList.remove('opacity-0', 'invisible');
  dom.modalBox.classList.remove('scale-95', 'opacity-0');
}

/**
 * Displays a simple alert modal with a message and an "OK" button.
 * @param message The message to display.
 * @param onOk An optional callback to run when the OK button is clicked.
 */
export function showAlertModal(message: string, onOk?: () => void) {
  dom.modalMessage.textContent = message;
  onConfirmCallback = onOk || null;
  
  // Configure the confirm button to act as an "OK" button
  dom.modalConfirmButton.textContent = 'OK';
  dom.modalConfirmButton.className = 'px-5 py-3 rounded-xl text-base font-medium text-primary-text transition-colors shadow-lg';
  dom.modalConfirmButton.classList.add('bg-accent', 'hover:bg-accent/90');
  
  // Hide the cancel button for simple alerts
  dom.modalCancelButton.classList.add('hidden');

  // Show the modal
  dom.modalOverlay.classList.remove('opacity-0', 'invisible');
  dom.modalBox.classList.remove('scale-95', 'opacity-0');
}