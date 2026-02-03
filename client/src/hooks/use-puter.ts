import { useState, useEffect, useCallback, useRef } from 'react';

interface PuterStatus {
  ready: boolean;
  online: boolean;
  services: {
    ai: boolean;
    kv: boolean;
    fs: boolean;
    auth: boolean;
    hosting: boolean;
  };
}

interface PuterUser {
  username: string;
  isGuest?: boolean;
}

declare global {
  interface Window {
    PuterService: any;
    puter: any;
  }
}

/**
 * Hook for using Puter services in React components
 */
export function usePuter() {
  const [status, setStatus] = useState<PuterStatus>({
    ready: false,
    online: false,
    services: { ai: false, kv: false, fs: false, auth: false, hosting: false }
  });
  const [user, setUser] = useState<PuterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadPuterService = async () => {
      // Load the puter-service.js script if not already loaded
      if (!document.querySelector('script[src*="puter-service.js"]')) {
        const script = document.createElement('script');
        script.src = '/grudgeos/lib/puter-service.js';
        document.head.appendChild(script);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for PuterService to be available
      const maxWait = 5000;
      const start = Date.now();
      while (!window.PuterService && Date.now() - start < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (window.PuterService) {
        await window.PuterService.init();
        
        setStatus(window.PuterService.getStatus());
        
        const currentUser = await window.PuterService.getUser();
        setUser(currentUser);

        unsubscribeRef.current = window.PuterService.subscribe((event: string, data: any) => {
          if (event === 'ready') {
            setStatus(window.PuterService.getStatus());
          } else if (event === 'signIn') {
            setUser(data);
          } else if (event === 'signOut') {
            setUser({ username: 'guest', isGuest: true });
          }
        });
      }

      setIsLoading(false);
    };

    loadPuterService();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const chat = useCallback(async (prompt: string, options?: { model?: string; systemPrompt?: string }) => {
    if (!window.PuterService) return null;
    return window.PuterService.chat(prompt, options);
  }, []);

  const kvGet = useCallback(async <T = any>(key: string, defaultValue?: T): Promise<T> => {
    if (!window.PuterService) return defaultValue as T;
    return window.PuterService.kvGet(key, defaultValue);
  }, []);

  const kvSet = useCallback(async (key: string, value: any): Promise<boolean> => {
    if (!window.PuterService) return false;
    return window.PuterService.kvSet(key, value);
  }, []);

  const kvDelete = useCallback(async (key: string): Promise<boolean> => {
    if (!window.PuterService) return false;
    return window.PuterService.kvDelete(key);
  }, []);

  const signIn = useCallback(async () => {
    if (!window.PuterService) return null;
    return window.PuterService.signIn();
  }, []);

  const signOut = useCallback(async () => {
    if (!window.PuterService) return;
    return window.PuterService.signOut();
  }, []);

  const deploy = useCallback(async (subdomain: string, sourcePath: string) => {
    if (!window.PuterService) throw new Error('Puter not available');
    return window.PuterService.deploy(subdomain, sourcePath);
  }, []);

  const listDeployments = useCallback(async () => {
    if (!window.PuterService) return [];
    return window.PuterService.listDeployments();
  }, []);

  return {
    status,
    user,
    isLoading,
    isOnline: status.online,
    chat,
    kvGet,
    kvSet,
    kvDelete,
    signIn,
    signOut,
    deploy,
    listDeployments
  };
}

/**
 * Hook for AI chat with Puter
 */
export function usePuterAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (
    prompt: string, 
    options?: { model?: string; systemPrompt?: string }
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.PuterService?.isOnline()) {
        throw new Error('AI unavailable in offline mode');
      }
      
      const result = await window.PuterService.chat(prompt, options);
      setResponse(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeCode = useCallback(async (code: string, language = 'javascript') => {
    return chat(code, {
      systemPrompt: `You are an expert ${language} code analyst. Analyze the code for bugs, improvements, and best practices.`
    });
  }, [chat]);

  const generateCode = useCallback(async (description: string, language = 'javascript') => {
    return chat(description, {
      systemPrompt: `You are an expert ${language} developer. Generate clean, working code. Return only code.`
    });
  }, [chat]);

  return {
    chat,
    analyzeCode,
    generateCode,
    isLoading,
    response,
    error,
    clearResponse: () => setResponse(null)
  };
}

/**
 * Hook for Puter KV storage
 */
export function usePuterStorage<T = any>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (window.PuterService) {
        await window.PuterService.init();
        const stored = await window.PuterService.kvGet(key, defaultValue);
        setValue(stored);
      }
      setIsLoading(false);
    };
    load();
  }, [key, defaultValue]);

  const set = useCallback(async (newValue: T) => {
    setValue(newValue);
    if (window.PuterService) {
      await window.PuterService.kvSet(key, newValue);
    }
  }, [key]);

  const remove = useCallback(async () => {
    setValue(defaultValue);
    if (window.PuterService) {
      await window.PuterService.kvDelete(key);
    }
  }, [key, defaultValue]);

  return { value, set, remove, isLoading };
}
