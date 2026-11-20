export interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

export interface BrowserSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

export function getSpeechRecognitionConstructor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function pickSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export type MicErrorCode =
  | 'permission_denied'
  | 'no_microphone'
  | 'not_supported'
  | 'empty_audio'
  | 'unknown';

export function classifyMicError(err: unknown): {
  code: MicErrorCode;
  messageEn: string;
  messageBn: string;
} {
  const name = err instanceof Error ? err.name : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /denied|permission/i.test(msg)) {
    return {
      code: 'permission_denied',
      messageEn:
        'Microphone permission was denied. Allow microphone access in your browser bar, or type your response directly below.',
      messageBn:
        'মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি। ব্রাউজার থেকে মাইক্রোফোন চালু করুন, অথবা নিচের টেক্সট বক্সে টাইপ করে উত্তর দিন।',
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || /not found|no device/i.test(msg)) {
    return {
      code: 'no_microphone',
      messageEn:
        'No microphone was detected on this device. You can continue seamlessly using the text-input fallback below.',
      messageBn:
        'এই ডিভাইসে কোনো মাইক্রোফোন পাওয়া যায়নি। নিচের টেক্সট ইনপুট ব্যবহার করে সম্পূর্ণ অনুশীলন চালিয়ে যেতে পারবেন।',
    };
  }

  if (name === 'NotSupportedError') {
    return {
      code: 'not_supported',
      messageEn:
        'Audio recording is not supported in this browser. Use the text-input fallback below to practice with the AI.',
      messageBn:
        'এই ব্রাউজারে অডিও রেকর্ডিং সমর্থিত নয়। নিচের টেক্সট ইনপুট ব্যবহার করে AI-এর সাথে কথা বলুন।',
    };
  }

  return {
    code: 'unknown',
    messageEn:
      'Unable to access the microphone right now. Use the text-input fallback below or try again.',
    messageBn:
      'এই মুহূর্তে মাইক্রোফোন চালু করা যায়নি। নিচের টেক্সট ইনপুট ব্যবহার করুন অথবা আবার চেষ্টা করুন।',
  };
}
