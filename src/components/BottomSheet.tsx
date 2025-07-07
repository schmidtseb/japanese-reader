import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../contexts/index.ts';

export const BottomSheet = () => {
    const { state, dispatch } = useUI();
    const { visible, content, targetElement } = state.bottomSheet;
    const sheetRef = useRef<HTMLDivElement>(null);
    
    // `isMounted` controls if the component is in the DOM.
    const [isMounted, setIsMounted] = useState(false);
    
    // `isActive` controls the animation state (on-screen vs. off-screen).
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (visible) {
            // Mount first
            setIsMounted(true);
            // Then trigger animation after a brief delay to ensure DOM is ready
            const timer = setTimeout(() => {
                setIsActive(true);
            }, 50); // Increased delay for more reliable animation trigger
            return () => clearTimeout(timer);
        } else {
            // Start exit animation immediately
            setIsActive(false);
            // Don't unmount here - let the transition end handle it
        }
    }, [visible]);

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        // Only handle the sheet's transform transition, not the backdrop
        if (e.target === sheetRef.current && e.propertyName === 'transform') {
            if (!isActive && !visible) {
                // Only unmount after exit animation is complete
                setIsMounted(false);
            }
        }
    };

    const handleClose = () => {
        dispatch({ type: 'HIDE_BOTTOM_SHEET' });
    };

    // Handle closing when clicking the backdrop or pressing Escape.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Rule 1: Ignore clicks within the sheet content itself.
            if (sheetRef.current && sheetRef.current.contains(target)) {
                return;
            }

            // Rule 2: Ignore clicks on the element that triggered the sheet.
            // Its own handler will toggle the sheet's visibility.
            if (targetElement && targetElement.contains(target)) {
                return;
            }

            // Rule 3: Ignore clicks on other major interactive elements in the UI.
            // This prevents the sheet from closing when the user intends to interact
            // with another part of the app, which avoids the "double-tap" problem.
            if (target.closest('button, a, [role="button"], .segment')) {
                return;
            }
            
            // If none of the above rules apply, the click was on a non-interactive
            // area (like the backdrop or page background), so close the sheet.
            handleClose();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };

        // Add listeners when mounted and visible
        if (isMounted && visible) {
            // Use `click` with capture. This makes it more reliable on mobile devices,
            // preventing issues where a `mousedown` might close the sheet before the
            // `click` to open it has fired.
            document.addEventListener('click', handleClickOutside, { capture: true });
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside, { capture: true });
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMounted, visible, targetElement]);

    // Handle highlighting the target segment in the main text.
    useEffect(() => {
        // Find and remove the highlight from any previously active segment.
        const prevActive = document.querySelector('.segment-bottom-sheet-active');
        if (prevActive) {
            prevActive.classList.remove('bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30', 'segment-bottom-sheet-active');
        }
        
        // Apply the highlight to the new target element if the sheet is visible.
        if (targetElement && visible) {
            targetElement.classList.add('bg-accent-selected-bg/60', 'dark:bg-accent-selected-bg/30', 'segment-bottom-sheet-active');
        }
    }, [targetElement, visible]);

    if (!isMounted) {
        return null;
    }

    return createPortal(
        <>
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-10 transition-opacity duration-300 md:hidden ${isActive ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
                aria-hidden="true"
            />
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-border rounded-t-2xl shadow-2xl-top transition-transform duration-300 ease-in-out max-h-[60vh] flex flex-col md:hidden ${
                    isActive ? 'translate-y-0' : 'translate-y-full'
                }`}
                onTransitionEnd={handleTransitionEnd}
            >
                <header className="flex-shrink-0 py-3 px-4 border-b border-border-subtle relative text-center">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-border rounded-full" aria-hidden="true" />
                    <h3 className="font-semibold text-lg text-text-primary font-japanese mt-2">{content.title}</h3>
                    <button title="Close details (Esc)" className="btn-ghost absolute top-1.5 right-2" onClick={handleClose}>
                        <i className="bi bi-x-lg text-2xl"></i>
                    </button>
                </header>
                <div className="p-4 overflow-y-auto no-scrollbar flex-grow bottom-sheet-content">
                    {content.body}
                </div>
            </div>
        </>,
        document.body
    );
};
