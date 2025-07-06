import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalOptions {
    confirmText?: string;
    confirmClass?: string;
    cancelText?: string;
}

interface AlertOptions {
    onOk?: () => void;
}

interface ModalContextType {
    showConfirmation: (message: string, onConfirm: () => void, options?: ModalOptions) => void;
    showAlert: (message: string, options?: AlertOptions) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children?: ReactNode }) {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        message: string;
        onConfirm?: () => void;
        onCancel?: () => void;
        confirmText?: string;
        confirmClass?: string;
        cancelText?: string;
        isAlert?: boolean;
    }>({ isOpen: false, message: '' });

    const handleClose = () => {
        setModalState({ isOpen: false, message: '' });
    };

    const handleConfirm = () => {
        modalState.onConfirm?.();
        handleClose();
    };

    const handleCancel = () => {
        modalState.onCancel?.();
        handleClose();
    };

    const showConfirmation = useCallback((message: string, onConfirm: () => void, options: ModalOptions = {}) => {
        setModalState({
            isOpen: true,
            message,
            onConfirm,
            onCancel: () => {},
            confirmText: options.confirmText || 'Confirm',
            confirmClass: options.confirmClass || 'bg-destructive hover:bg-destructive-hover',
            cancelText: options.cancelText || 'Cancel',
            isAlert: false,
        });
    }, []);

    const showAlert = useCallback((message: string, options: AlertOptions = {}) => {
        setModalState({
            isOpen: true,
            message,
            onConfirm: options.onOk,
            confirmText: 'OK',
            confirmClass: 'bg-accent hover:bg-accent/90',
            isAlert: true,
        });
    }, []);

    return (
        <ModalContext.Provider value={{ showConfirmation, showAlert }}>
            {children}
            {modalState.isOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity animate-fade-in">
                    <div className="glass-morphism rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all animate-slide-in">
                        <p className="text-text-secondary text-lg mb-8">{modalState.message}</p>
                        <div className="flex justify-end gap-4">
                            {!modalState.isAlert && (
                                <button onClick={handleCancel} className="px-5 py-3 rounded-xl text-base font-medium text-text-secondary bg-surface-subtle hover:bg-surface-hover transition-colors shadow-sm">
                                    {modalState.cancelText}
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                className={`px-5 py-3 rounded-xl text-base font-medium text-primary-text transition-colors shadow-lg ${modalState.confirmClass}`}
                            >
                                {modalState.confirmText}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};