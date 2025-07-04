import React from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../contexts/index.ts';

export function Tooltip() {
    const { state, dispatch } = useUI();
    const { visible, content, position } = state.tooltip;

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
            className="fixed z-50 max-w-sm rounded-xl glass-morphism border border-border/50 shadow-2xl p-4 text-base transition-all duration-200 max-h-96 overflow-y-auto no-scrollbar"
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
