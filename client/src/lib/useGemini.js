import { useCallback } from 'react';
import { db } from './storage.js';
import { geminiGenerate, promptParts } from './gemini.js';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';

/** Returns callGemini(prompt, imageBase64?, mime?) → text | null (null = no key or error, already toasted). */
export function useGemini() {
  const { openSettings } = useApp();
  const toast = useToast();
  return useCallback(async (prompt, imageBase64 = null, mime = 'image/jpeg') => {
    const key = db.apiKey();
    if (!key) { toast('Add your Gemini API key in ⚙️ Settings to use AI features.', 'info'); openSettings(); return null; }
    try { return await geminiGenerate(key, promptParts(prompt, imageBase64, mime)); }
    catch (err) { toast('AI Error: ' + err.message, 'error'); return null; }
  }, [openSettings, toast]);
}
