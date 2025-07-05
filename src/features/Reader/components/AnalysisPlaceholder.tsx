// src/features/Reader/components/AnalysisPlaceholder.tsx
import React from 'react';

export const AnalysisPlaceholder = ({ sentence, isLoading = true }: { sentence: string; isLoading?: boolean }) => (
    <div className="relative p-4 bg-surface-soft rounded-lg min-h-36 animate-fade-in">
         <div className="flex flex-wrap items-start gap-x-1.5 gap-y-1 text-2xl pr-8">
             <p className={`text-2xl text-text-muted font-japanese transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                 {sentence}
             </p>
         </div>
         {isLoading && (
             <div className="absolute top-4 right-4 flex items-center gap-2">
                 <i className="bi bi-arrow-repeat text-lg text-text-muted animate-spin" role="status" aria-label="Loading analysis"></i>
             </div>
         )}
    </div>
);