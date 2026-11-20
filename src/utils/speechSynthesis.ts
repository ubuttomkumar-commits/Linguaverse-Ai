export type PlaybackSpeed = 0.75 | 1.0;

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore browser speech cancellation quirks
  }
}

export function speakEnglishExample(params: {
  text: string;
  rate: PlaybackSpeed;
  onEnd?: () => void;
  onError?: () => void;
}): boolean {
  if (!isSpeechSynthesisSupported()) {
    params.onError?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(params.text);
    utterance.lang = 'en-US';
    utterance.rate = params.rate;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang === 'en-US' && /natural|google|samantha/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith('en-'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => params.onEnd?.();
    utterance.onerror = () => params.onEnd?.();

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    params.onError?.();
    return false;
  }
}
