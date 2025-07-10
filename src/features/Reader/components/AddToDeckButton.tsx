// src/features/Reader/components/AddToDeckButton.tsx
import React, { useMemo } from 'react';
import { useAppData } from '../../../contexts/index.ts';
import { useModal } from '../../../components/Modal.tsx';

export function AddToDeckButton({ itemType, itemContent }: { itemType: 'word' | 'grammar', itemContent: any }) {
    const { state, dispatch } = useAppData();
    const { showAlert } = useModal();
    
    const existingItem = useMemo(() => {
        if (itemType === 'word') {
            return state.reviewDeck.find(i =>
                i.type === 'word' &&
                i.content.japanese_segment === itemContent.japanese_segment &&
                i.content.reading === itemContent.reading
            );
        }
        if (itemType === 'grammar') {
            return state.reviewDeck.find(i =>
                i.type === 'grammar' &&
                i.content.pattern_name === itemContent.pattern_name
            );
        }
        return undefined;
    }, [state.reviewDeck, itemType, itemContent]);

    const isInDeck = !!existingItem;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        const { currentTextEntryId } = state;
        
        if (!currentTextEntryId) {
            showAlert("Cannot add an item to the deck without first saving the text.");
            return;
        }

        if (isInDeck) {
            dispatch({ type: 'REMOVE_REVIEW_ITEM', payload: existingItem.id });
        } else {
             const newItem = {
                id: crypto.randomUUID(),
                type: itemType,
                content: itemContent,
                textEntryId: currentTextEntryId,
                srsStage: 0,
                intervalModifier: 1.0, // Start with a default modifier
                incorrectAnswerCount: 0,
                nextReviewDate: new Date().setHours(0,0,0,0),
                addedAt: Date.now(),
            };
            dispatch({ type: 'ADD_OR_UPDATE_REVIEW_ITEM', payload: newItem });
        }
    };
    
    if (isInDeck) {
        return (
            <button
                onClick={handleClick}
                className="in-deck-button text-xs font-semibold px-2 py-1 rounded-md border border-accent text-accent bg-accent-subtle-bg hover:bg-destructive-subtle-bg hover:text-destructive hover:border-destructive transition inline-flex items-center gap-2"
                title="Remove from Review Deck"
            >
                <i className="bi bi-check-lg text-base"></i>
                In Deck
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            className="add-to-deck-button text-xs font-semibold px-2 py-1 rounded-md border border-primary-subtle-text text-primary-subtle-text hover:bg-primary-subtle-bg hover:text-primary-subtle-text/80 transition inline-flex items-center gap-2"
            title="Add to Review Deck"
        >
            <i className="bi bi-plus-lg text-base"></i>
            Add to Deck
        </button>
    );
};