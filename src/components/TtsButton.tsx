// ui/components/TtsButton.tsx
import { speakText } from '../services/tts.ts';

export const TtsButton = ({ text, title = 'Read aloud' }: { text: string, title?: string }) => (
    <button className="tts-button btn-ghost p-1 text-text-muted hover:text-text-primary" title={title} onClick={(e) => { e.stopPropagation(); speakText(text); }}>
        <i className="bi bi-volume-up text-base"></i>
    </button>
);