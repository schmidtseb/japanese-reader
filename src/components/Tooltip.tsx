import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../contexts/index.ts';

export function Tooltip() {
    const { state, dispatch } = useUI();
    const { visible, content, position, pinned, targetElement } = state.tooltip;
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This effect adds a document-level click listener to close the tooltip
        // when the user clicks outside of it.
        if (!visible || !pinned) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            // The element that triggered the tooltip has its own click handler to toggle visibility.
            // We ignore clicks on it so its own logic can run without this handler interfering.
            if (targetElement && targetElement.contains(event.target as Node)) {
                return;
            }
            
            // We also ignore clicks inside the tooltip itself, allowing for interaction with its content.
            if (tooltipRef.current && tooltipRef.current.contains(event.target as Node)) {
                return;
            }
            
            // Any other click on the page should hide the tooltip.
            dispatch({ type: 'HIDE_TOOLTIP' });
        };

        // We use 'mousedown' to ensure this handler runs before other potential 'click' handlers.
        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup the listener when the tooltip is hidden or the component unmounts.
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible, pinned, targetElement, dispatch]);


    const handleMouseOver = () => {
        // This could be used to cancel a hide timeout if we re-implement hover-based hiding
    };

    const handleMouseOut = () => {
        // If not pinned, schedule hide
        if (!state.tooltip.pinned) {
            dispatch({ type: 'HIDE_TOOLTIP' });
        }
    };

    if (!visible) {
        return null;
    }

    return createPortal(
        <div
            ref={tooltipRef}
            className="fixed z-50 max-w-sm rounded-xl glass-morphism border border-border/50 shadow-2xl p-4 text-base transition-all duration-200 max-h-96 overflow-y-auto no-scrollbar tooltip-content"
            style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
                opacity: 1,
            }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
        >
            {content}
        </div>,
        document.body
    );
};