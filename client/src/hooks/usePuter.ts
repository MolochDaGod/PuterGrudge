import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    puter: {
      kv: {
        set: (key: string, value: string) => Promise<void>;
        get: (key: string) => Promise<string | null>;
        del: (key: string) => Promise<void>;
        list: (options?: { prefix?: string }) => Promise<string[]>;
      };
      auth: {
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        getUser: () => Promise<{ username: string; uuid: string } | null>;
        isSignedIn: () => boolean;
      };
      ai: {
        chat: (message: string, options?: { model?: string }) => Promise<string>;
      };
    };
  }
}

interface PuterUser {
  username: string;
  uuid: string;
}

interface UsePuterReturn {
  isReady: boolean;
  isSignedIn: boolean;
  user: PuterUser | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  kv: {
    set: (key: string, value: any) => Promise<void>;
    get: <T = any>(key: string) => Promise<T | null>;
    del: (key: string) => Promise<void>;
    list: (prefix?: string) => Promise<string[]>;
  };
  ai: {
    chat: (message: string, model?: string) => Promise<string>;
  };
}

export function usePuter(): UsePuterReturn {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<PuterUser | null>(null);

  useEffect(() => {
    const checkPuter = () => {
      if (typeof window !== 'undefined' && window.puter) {
        setIsReady(true);
        checkAuth();
      } else {
        setTimeout(checkPuter, 100);
      }
    };
    checkPuter();
  }, []);

  const checkAuth = async () => {
    try {
      if (window.puter.auth.isSignedIn()) {
        const userData = await window.puter.auth.getUser();
        if (userData) {
          setUser(userData);
          setIsSignedIn(true);
        }
      }
    } catch (e) {
      console.log('[Puter] Auth check failed:', e);
    }
  };

  const signIn = useCallback(async () => {
    if (!isReady) return;
    try {
      await window.puter.auth.signIn();
      await checkAuth();
    } catch (e) {
      console.log('[Puter] Sign in failed:', e);
    }
  }, [isReady]);

  const signOut = useCallback(async () => {
    if (!isReady) return;
    try {
      await window.puter.auth.signOut();
      setUser(null);
      setIsSignedIn(false);
    } catch (e) {
      console.log('[Puter] Sign out failed:', e);
    }
  }, [isReady]);

  const kvSet = useCallback(async (key: string, value: any) => {
    if (!isReady) throw new Error('Puter not ready');
    await window.puter.kv.set(key, JSON.stringify(value));
  }, [isReady]);

  const kvGet = useCallback(async <T = any>(key: string): Promise<T | null> => {
    if (!isReady) throw new Error('Puter not ready');
    const data = await window.puter.kv.get(key);
    return data ? JSON.parse(data) : null;
  }, [isReady]);

  const kvDel = useCallback(async (key: string) => {
    if (!isReady) throw new Error('Puter not ready');
    await window.puter.kv.del(key);
  }, [isReady]);

  const kvList = useCallback(async (prefix?: string): Promise<string[]> => {
    if (!isReady) throw new Error('Puter not ready');
    return window.puter.kv.list(prefix ? { prefix } : undefined);
  }, [isReady]);

  const aiChat = useCallback(async (message: string, model = 'gpt-4o-mini'): Promise<string> => {
    if (!isReady) throw new Error('Puter not ready');
    return window.puter.ai.chat(message, { model });
  }, [isReady]);

  return {
    isReady,
    isSignedIn,
    user,
    signIn,
    signOut,
    kv: {
      set: kvSet,
      get: kvGet,
      del: kvDel,
      list: kvList,
    },
    ai: {
      chat: aiChat,
    },
  };
}
