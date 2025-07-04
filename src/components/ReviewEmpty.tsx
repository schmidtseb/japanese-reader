// ui/components/ReviewEmpty.tsx
import React from 'react';

interface ReviewEmptyProps {
    onManage: () => void;
    onExit: () => void;
}

export const ReviewEmpty = ({ onManage, onExit }: ReviewEmptyProps) => (
    <div className="text-center py-16 px-6 max-w-lg mx-auto">
        <i className="bi bi-journal-bookmark text-6xl text-text-muted/50 mx-auto mb-6" aria-hidden="true"></i>
        <h2 className="text-2xl font-bold text-text-primary">Review Deck is Empty</h2>
        <p className="mt-2 text-text-secondary">Add items by clicking the "Add to Deck" button on words or grammar patterns.</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onExit} className="btn-secondary">Back to Analyzer</button>
            <button onClick={onManage} className="btn-ghost">Manage Deck</button>
        </div>
    </div>
);