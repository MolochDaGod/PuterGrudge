import { useState, useCallback, useEffect, useRef } from 'react';

interface Deployment {
  subdomain: string;
  url: string;
  deployedAt: string;
  status: string;
  sourcePath?: string;
}

declare global {
  interface Window {
    DeployService: any;
  }
}

/**
 * Hook for deploying to puter.site
 */
export function useDeploy() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDeployment, setLastDeployment] = useState<Deployment | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadService = async () => {
      // Load deploy-service.js if not already loaded
      if (!document.querySelector('script[src*="deploy-service.js"]')) {
        const script = document.createElement('script');
        script.src = '/grudgeos/lib/deploy-service.js';
        document.head.appendChild(script);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for DeployService
      const maxWait = 5000;
      const start = Date.now();
      while (!window.DeployService && Date.now() - start < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (window.DeployService) {
        await window.DeployService.init();
        
        const list = await window.DeployService.listDeployments();
        setDeployments(list);

        unsubscribeRef.current = window.DeployService.subscribe((event: string, data: any) => {
          if (event === 'deployComplete') {
            setLastDeployment(data);
            setDeployments(prev => [...prev.filter(d => d.subdomain !== data.subdomain), data]);
          } else if (event === 'undeploy') {
            setDeployments(prev => prev.filter(d => d.subdomain !== data.subdomain));
          }
        });
      }
    };

    loadService();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const deploy = useCallback(async (subdomain: string, sourcePath: string) => {
    setIsDeploying(true);
    setError(null);
    
    try {
      const result = await window.DeployService.deploy(subdomain, sourcePath);
      setLastDeployment(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsDeploying(false);
    }
  }, []);

  const quickDeploy = useCallback(async (subdomain: string, htmlContent: string) => {
    setIsDeploying(true);
    setError(null);
    
    try {
      const result = await window.DeployService.quickDeploy(subdomain, htmlContent);
      setLastDeployment(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsDeploying(false);
    }
  }, []);

  const deployStatic = useCallback(async (subdomain: string, files: Record<string, string>) => {
    setIsDeploying(true);
    setError(null);
    
    try {
      const result = await window.DeployService.deployStatic(subdomain, files);
      setLastDeployment(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsDeploying(false);
    }
  }, []);

  const deployTemplate = useCallback(async (subdomain: string, templateName: string) => {
    setIsDeploying(true);
    setError(null);
    
    try {
      const result = await window.DeployService.deployTemplate(subdomain, templateName);
      setLastDeployment(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsDeploying(false);
    }
  }, []);

  const undeploy = useCallback(async (subdomain: string) => {
    try {
      await window.DeployService.undeploy(subdomain);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, []);

  const refreshDeployments = useCallback(async () => {
    if (window.DeployService) {
      const list = await window.DeployService.listDeployments();
      setDeployments(list);
    }
  }, []);

  return {
    deployments,
    isDeploying,
    error,
    lastDeployment,
    deploy,
    quickDeploy,
    deployStatic,
    deployTemplate,
    undeploy,
    refreshDeployments
  };
}

/**
 * Hook for AI-assisted deployments
 */
export function useAIDeploy() {
  const { quickDeploy, isDeploying, error } = useDeploy();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDeploy = useCallback(async (subdomain: string, description: string) => {
    setIsGenerating(true);
    
    try {
      // Use PuterService to generate HTML with AI
      if (!window.PuterService?.isOnline()) {
        throw new Error('AI not available in offline mode');
      }

      const html = await window.PuterService.chat(description, {
        systemPrompt: `You are a web developer. Generate a complete, beautiful HTML page based on the description.
Return ONLY the HTML code, no explanations. Include inline CSS and any necessary JavaScript.
Make it responsive and modern with a dark theme.`
      });

      // Deploy the generated HTML
      return await quickDeploy(subdomain, html);
    } catch (e: any) {
      throw new Error(`AI deploy failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [quickDeploy]);

  return {
    generateAndDeploy,
    isGenerating,
    isDeploying,
    error
  };
}
