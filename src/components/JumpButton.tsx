import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppData, useUI, View } from '../contexts/index.ts';

export function JumpButton() {
    const { state: appDataState } = useAppData();
    const { state: uiState } = useUI();
    const [isVisible, setIsVisible] = useState(false);
    
    const updateVisibility = useCallback(() => {
        const isReadingMode = appDataState.view === View.ReadingMode;
        const isReviewMode = appDataState.view === View.Review;

        let shouldBeVisible = false;

        if (!isReviewMode && !uiState.bottomSheet.visible) {
            if (isReadingMode) {
                shouldBeVisible = window.scrollY > window.innerHeight / 2;
            } else if (appDataState.view === View.Reader && appDataState.selectedSentence) {
                const readerView = document.getElementById('reader-view-text-container');
                if (readerView) {
                    const readerRect = readerView.getBoundingClientRect();
                    const isIntersecting = readerRect.bottom > 0 && readerRect.top < window.innerHeight;
                    shouldBeVisible = !isIntersecting;
                }
            }
        }
        setIsVisible(shouldBeVisible);
    }, [appDataState.view, appDataState.selectedSentence, uiState.bottomSheet.visible]);

    useEffect(() => {
        window.addEventListener('scroll', updateVisibility);
        return () => window.removeEventListener('scroll', updateVisibility);
    }, [updateVisibility]);

    useEffect(() => {
        updateVisibility();
    }, [appDataState.view, appDataState.selectedSentence, uiState.bottomSheet.visible]);
    
    const handleClick = () => {
        if (appDataState.view === View.ReadingMode) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (appDataState.view === View.Reader && appDataState.selectedSentence) {
            const selectedSentenceEl = document.querySelector('.clickable-sentence.selected');
            selectedSentenceEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (!isVisible) return null;

    return createPortal(
        <button
            className={`fixed bottom-5 right-5 w-12 h-12 bg-accent text-primary-text rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition-all duration-300 hover:bg-accent/90 z-50 ${
                isVisible ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-5'
            }`}
            onClick={handleClick}
            title={appDataState.view === View.ReadingMode ? 'Scroll to top' : 'Back to analyzed sentence'}
        >
            &#8679;
        </button>,
        document.body
    );
};
