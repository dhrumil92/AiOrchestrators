import { createContext, useContext } from 'react';

/**
 * session – current demo session (or null)
 * goTab   – switch the main tab: 'household' | 'vendor' | 'ai'
 */
export const AppCtx = createContext({ session: null, goTab: () => {} });
export const useApp = () => useContext(AppCtx);
