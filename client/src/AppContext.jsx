import { createContext, useContext } from 'react';

/**
 * session      – current login session (or null)
 * openSettings – open the ⚙️ Settings panel (e.g. when the Gemini key is missing)
 * goTab        – switch the main tab: 'household' | 'vendor' | 'ai'
 * askAi        – send a command to the AI Advisor, e.g. { type: 'quote', quoteId, requestId }
 */
export const AppCtx = createContext({ session: null, openSettings: () => {}, goTab: () => {}, askAi: () => {} });
export const useApp = () => useContext(AppCtx);
