// Records from the microphone so the server can transcribe Hindi and Gujarati.
const MAX_SECONDS = 60;
// A recording smaller than this holds no speech, only the container header.
export const MIN_AUDIO_BYTES = 1000;

export async function startRecording({ onDone, onError }) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    onError('This browser cannot record audio. Please type instead.');
    return null;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    onError('Microphone access was blocked. Allow it in the browser, or type instead.');
    return null;
  }
  const type = ['audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    clearTimeout(timer);
    stream.getTracks().forEach(t => t.stop());
    if (!rec.cancelled) onDone(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
  };
  const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, MAX_SECONDS * 1000);
  rec.start();
  return rec;
}

/** Stops the recording and throws the audio away. The microphone is released. */
export function cancelRecording(rec) {
  if (!rec || rec.state === 'inactive') return;
  rec.cancelled = true;
  rec.stop();
}
