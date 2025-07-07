// src/features/Reader/components/ReadingModeHeader.tsx
import React, { useState, useEffect } from 'react';
import { TextEntry } from '../../../contexts/index.ts';

interface ReadingModeHeaderProps {
    entry: TextEntry;
    onExit: () => void;
    onSentenceChange: (index: number) => void;
    totalSentences: number;
    isVisible: boolean;
    onKeepVisible: (keepVisible: boolean) => void;
}

export const ReadingModeHeader = ({ entry, onExit, onSentenceChange, totalSentences, isVisible, onKeepVisible }: ReadingModeHeaderProps) => {
    const sentenceIndex = entry.readingProgress;
    const [inputValue, setInputValue] = useState(String(sentenceIndex + 1));

    useEffect(() => {
        // Sync with external state changes (e.g., from prev/next buttons)
        setInputValue(String(sentenceIndex + 1));
    }, [sentenceIndex]);

    const handleJump = () => {
        let val = parseInt(inputValue, 10);

        // If input is invalid/empty, reset to current index and do nothing.
        if (isNaN(val)) {
            setInputValue(String(sentenceIndex + 1));
            return;
        }
        
        // Clamp value to the valid range
        if (val < 1) val = 1;
        if (val > totalSentences) val = totalSentences;
        
        onSentenceChange(val - 1);
        setInputValue(String(val)); // Sync input display with potentially corrected value
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only digits
        const numericValue = value.replace(/[^0-9]/g, '');
        setInputValue(numericValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleJump();
            e.currentTarget.blur();
        }
    };
    
    return (
        <header 
            className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl z-30 bg-surface/90 backdrop-blur-md shadow-sm rounded-b-lg transition-transform duration-250 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
            onMouseEnter={() => onKeepVisible(true)}
            onMouseLeave={() => onKeepVisible(false)}
        >
             <div className="p-2">
                <div className="flex justify-between items-center">
                    <button onClick={onExit} title="Exit Reading Mode" className="p-2 rounded-full hover:bg-surface-hover transition-colors">
                         <i className="bi bi-box-arrow-right text-2xl text-text-secondary"></i>
                    </button>
                    <div className="font-medium text-text-secondary flex items-center gap-1">
                         <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={inputValue}
                            onChange={handleInputChange}
                            onFocus={() => onKeepVisible(true)}
                            onBlur={() => {
                                handleJump();
                                onKeepVisible(false);
                            }}
                            onKeyDown={handleKeyDown}
                            title="Enter sentence number and press Enter"
                            className="w-12 text-center bg-surface-subtle rounded-md p-1 focus:ring-2 focus:ring-focus-ring focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                         <span>/ {totalSentences}</span>
                    </div>
                </div>
             </div>
        </header>
    );
};