// ui/components/ErrorComponent.tsx
import React, { useState, useEffect } from 'react';

const RETRY_DELAY_SECONDS = 5;

export const ErrorComponent = ({ error, onRetry }: { error: Error; onRetry?: () => void }) => {
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [countdown, setCountdown] = useState(0);
    
    const message = error?.message || 'An unknown error occurred.';

    useEffect(() => {
        const isLimitError = /rate limit|429/i.test(message);
        setIsRateLimited(isLimitError);

        if (isLimitError) {
            setCountdown(RETRY_DELAY_SECONDS);
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        } else {
            setCountdown(0);
        }
    }, [message]);

    const handleRetry = () => {
        if (onRetry) {
            if(isRateLimited) {
                setCountdown(RETRY_DELAY_SECONDS);
            }
            onRetry();
        }
    };

    const displayMessage = isRateLimited ? 'Too many requests' : 'API Error';
    const displayDetail = isRateLimited ? 'You are analyzing sentences too quickly. Please wait a moment before trying again.' : message;

    return (
        <div role="alert" className="p-4 bg-destructive-subtle-bg border-l-4 border-destructive rounded-r-lg shadow-md my-4 transition-all duration-300">
            <div className="flex">
                <div className="flex-shrink-0">
                    <i className="bi bi-x-circle-fill text-xl text-destructive" aria-hidden="true"></i>
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-semibold text-destructive-subtle-text">{displayMessage}</p>
                    {displayDetail && (
                        <div className="mt-2 text-sm text-destructive-subtle-text/80">
                            <p>{displayDetail}</p>
                        </div>
                    )}
                    {onRetry && (
                        <button
                            onClick={handleRetry}
                            disabled={countdown > 0}
                            className="mt-3 text-xs font-semibold px-2 py-1 rounded-md border border-destructive-subtle-text text-destructive-subtle-text hover:bg-destructive-subtle-text/10 transition disabled:opacity-50 disabled:cursor-wait"
                        >
                            {countdown > 0 ? `Try Again in ${countdown}s` : 'Try Again'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
