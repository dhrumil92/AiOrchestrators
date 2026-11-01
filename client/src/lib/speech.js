// Thin wrapper around the browser Web Speech API (Chrome / Edge).
export function startSpeech({ onResult, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onError?.('unsupported'); return null; }
  const rec = new SR();
  rec.lang = 'en-IN';
  rec.continuous = false;
  rec.interimResults = false;
  rec.onresult = e => onResult(e.results[0][0].transcript);
  rec.onerror = e => onError?.(e.error);
  rec.onend = () => onEnd?.();
  rec.start();
  return rec;
}
