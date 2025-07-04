// ui/components/ErrorComponent.tsx
export const ErrorComponent = ({ message, detail, onRetry }: { message: string, detail?: string, onRetry?: () => void }) => (
    <div role="alert" className="p-4 bg-destructive-subtle-bg border-l-4 border-destructive rounded-r-lg shadow-md my-4 transition-all duration-300">
        <div className="flex">
            <div className="flex-shrink-0">
                <i className="bi bi-x-circle-fill text-xl text-destructive" aria-hidden="true"></i>
            </div>
            <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-destructive-subtle-text">{message}</p>
                {detail && <div className="mt-2 text-sm text-destructive-subtle-text/80"><p>{detail}</p></div>}
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-3 text-xs font-semibold px-2 py-1 rounded-md border border-destructive-subtle-text text-destructive-subtle-text hover:bg-destructive-subtle-text/10 transition"
                    >
                        Try Again
                    </button>
                )}
            </div>
        </div>
    </div>
);