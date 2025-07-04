// services/tts.ts

// This will hold the selected voice globally within this module.
let japaneseVoice: SpeechSynthesisVoice | null = null;

/**
 * Sets the Japanese voice to be used for synthesis.
 * @param voice The voice to set.
 */
function setJapaneseVoice(voice: SpeechSynthesisVoice | null) {
    japaneseVoice = voice;
}

/** Loads available speech synthesis voices and selects the best available Japanese voice. */
export function loadSpeechSynthesisVoices() {
  if (!('speechSynthesis' in window)) {
    document.body.classList.remove('tts-available');
    return;
  }
  
  const getAndSetBestVoice = () => {
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang === 'ja-JP');
    
    if (voices.length === 0) {
        setJapaneseVoice(null);
        document.body.classList.remove('tts-available');
        return;
    }

    // Prioritization logic:
    // 1. Prefer voices with "Google" in the name (often high quality).
    // 2. Prefer network-based voices (not local).
    // 3. Fallback to the first available Japanese voice.
    const googleVoice = voices.find(v => v.name.includes('Google'));
    const networkVoice = voices.find(v => !v.localService);
    
    const bestVoice = googleVoice || networkVoice || voices[0] || null;
    
    setJapaneseVoice(bestVoice);
    document.body.classList.toggle('tts-available', !!bestVoice);
  };
  
  // Voices may load asynchronously.
  getAndSetBestVoice();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = getAndSetBestVoice;
  }
}

/** Speaks the given text using the browser's Text-to-Speech API. */
export function speakText(text: string) {
  if (!('speechSynthesis' in window) || !japaneseVoice) {
    console.warn("Speech synthesis not available or no Japanese voice found.");
    return; // Silently fail if TTS is not available. The button should be hidden anyway.
  }

  // Stop any currently speaking utterance to prevent overlap.
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = japaneseVoice;
  utterance.lang = 'ja-JP';
  utterance.rate = 0.9; // Slightly slower is often better for language learners.
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}
