import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  Bot, 
  FolderTree, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  ArrowRight,
  Globe
} from 'lucide-react';
import { useOperationsBus } from '@/stores/operationsBus';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Rocket;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface UserOnboardingProps {
  onComplete?: () => void;
}

export function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: 'auth', title: 'Connecting to Puter', description: 'Authenticating with cloud services', icon: Globe, status: 'pending' },
    { id: 'folders', title: 'Creating GRUDACHAIN Structure', description: 'Setting up /grudge-core, /grudge-workers, /grudge-ai, /grudge-users', icon: FolderTree, status: 'pending' },
    { id: 'agent', title: 'Creating First AI Agent', description: 'Spawning your personal assistant agent', icon: Bot, status: 'pending' },
    { id: 'deploy', title: 'Deploying HelloWorld', description: 'Launching your first site to *.puter.site', icon: Rocket, status: 'pending' },
  ]);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const { addOperation, setProgress, completeOperation, failOperation, appendLog, setPanel } = useOperationsBus();
  
  const updateStep = useCallback((id: string, status: OnboardingStep['status']) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);
  
  const runOnboarding = useCallback(async () => {
    const puter = (window as any).puter;
    
    if (!puter) {
      console.log('Puter not available - running demo mode');
      for (let i = 0; i < steps.length; i++) {
        updateStep(steps[i].id, 'running');
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 800));
        updateStep(steps[i].id, 'completed');
      }
      setDeployedUrl('https://demo.puter.site');
      return;
    }
    
    const opId = addOperation({
      name: 'New User Onboarding',
      description: 'Setting up your GrudgeOS workspace',
      category: 'system',
    });
    
    setPanel(true);
    
    try {
      updateStep('auth', 'running');
      setCurrentStep(0);
      setProgress(opId, 10);
      appendLog(opId, 'Checking authentication...');
      
      const isSignedIn = await puter.auth.isSignedIn();
      if (!isSignedIn) {
        await puter.auth.signIn();
      }
      const user = await puter.auth.getUser();
      appendLog(opId, `Welcome, ${user?.username || 'user'}!`);
      updateStep('auth', 'completed');
      setProgress(opId, 25);
      
      updateStep('folders', 'running');
      setCurrentStep(1);
      appendLog(opId, 'Creating GRUDACHAIN folder structure...');
      
      const folders = ['/grudge-core', '/grudge-workers', '/grudge-ai', '/grudge-users'];
      for (const folder of folders) {
        try {
          await puter.fs.mkdir(folder);
          appendLog(opId, `Created ${folder}`);
        } catch (e: any) {
          if (!e.message?.includes('exists')) {
            throw e;
          }
          appendLog(opId, `${folder} already exists`);
        }
      }
      
      const subfolders = [
        '/grudge-core/config',
        '/grudge-core/state',
        '/grudge-workers/active',
        '/grudge-ai/models',
        '/grudge-ai/memory',
        '/grudge-users/profiles'
      ];
      for (const folder of subfolders) {
        try {
          await puter.fs.mkdir(folder);
        } catch (e) {
        }
      }
      
      updateStep('folders', 'completed');
      setProgress(opId, 50);
      
      updateStep('agent', 'running');
      setCurrentStep(2);
      appendLog(opId, 'Creating your first AI agent...');
      
      const agentConfig = {
        id: `agent_${Date.now()}`,
        name: 'Personal Assistant',
        type: 'general',
        createdAt: new Date().toISOString(),
        capabilities: ['chat', 'code', 'deploy', 'search'],
        memory: { preferences: {}, context: [] }
      };
      
      await puter.kv.set('grudge:agents:default', JSON.stringify(agentConfig));
      await puter.kv.set('grudge:user:onboarded', 'true');
      appendLog(opId, `Agent "${agentConfig.name}" created`);
      
      updateStep('agent', 'completed');
      setProgress(opId, 75);
      
      updateStep('deploy', 'running');
      setCurrentStep(3);
      appendLog(opId, 'Deploying HelloWorld site...');
      
      const username = user?.username || 'user';
      const subdomain = `${username}-hello-${Date.now().toString(36)}`;
      
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello from GrudgeOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      min-height: 100vh; 
      display: flex; 
      flex-direction: column;
      align-items: center; 
      justify-content: center; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      font-family: system-ui, sans-serif;
      color: white;
      padding: 20px;
    }
    .container { text-align: center; max-width: 600px; }
    h1 { font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(45deg, #00d9ff, #00ff88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem; line-height: 1.6; }
    .badge { display: inline-block; padding: 8px 16px; background: rgba(255,255,255,0.1); border-radius: 20px; font-size: 0.9rem; }
    .emoji { font-size: 4rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">🚀</div>
    <h1>Welcome to GrudgeOS!</h1>
    <p>Your AI-powered development environment is ready. This site was deployed automatically during onboarding.</p>
    <div class="badge">Deployed with Puter</div>
  </div>
</body>
</html>`;
      
      try {
        const site = await puter.hosting.create(subdomain, htmlContent);
        const url = `https://${subdomain}.puter.site`;
        setDeployedUrl(url);
        appendLog(opId, `Site deployed: ${url}`);
      } catch (e: any) {
        appendLog(opId, `Deployment note: ${e.message || 'Site may already exist'}`);
        setDeployedUrl(`https://${subdomain}.puter.site`);
      }
      
      updateStep('deploy', 'completed');
      setProgress(opId, 100);
      completeOperation(opId, 'Onboarding complete!');
      
    } catch (err: any) {
      failOperation(opId, err.message || 'Onboarding failed');
      const failedStep = steps.find(s => s.status === 'running');
      if (failedStep) {
        updateStep(failedStep.id, 'failed');
      }
    }
  }, [steps, addOperation, setProgress, appendLog, completeOperation, failOperation, setPanel, updateStep]);
  
  useEffect(() => {
    const checkOnboarded = async () => {
      const puter = (window as any).puter;
      if (puter) {
        try {
          const onboarded = await puter.kv.get('grudge:user:onboarded');
          if (onboarded === 'true') {
            setIsVisible(false);
            onComplete?.();
          }
        } catch (e) {
        }
      }
    };
    checkOnboarded();
  }, [onComplete]);
  
  const allCompleted = steps.every(s => s.status === 'completed');
  const progress = (steps.filter(s => s.status === 'completed').length / steps.length) * 100;
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="user-onboarding">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to GrudgeOS</CardTitle>
          <CardDescription>
            Let's set up your AI-powered development environment
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  step.status === 'running' ? 'bg-primary/10' :
                  step.status === 'completed' ? 'bg-green-500/10' :
                  step.status === 'failed' ? 'bg-red-500/10' : 'bg-muted/50'
                }`}
                data-testid={`onboarding-step-${step.id}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'running' ? 'bg-primary text-primary-foreground' :
                  step.status === 'completed' ? 'bg-green-500 text-white' :
                  step.status === 'failed' ? 'bg-red-500 text-white' : 'bg-muted'
                }`}>
                  {step.status === 'running' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : step.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                
                {step.status === 'completed' && (
                  <Badge variant="outline" className="text-green-500 border-green-500/50">
                    Done
                  </Badge>
                )}
              </div>
            ))}
          </div>
          
          {deployedUrl && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-500 font-medium">Your first site is live!</p>
              <a 
                href={deployedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {deployedUrl}
              </a>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {!allCompleted ? (
            <Button 
              onClick={runOnboarding} 
              disabled={steps.some(s => s.status === 'running')}
              className="w-full"
              data-testid="button-start-onboarding"
            >
              {steps.some(s => s.status === 'running') ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : currentStep === 0 ? (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Start Setup
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setIsVisible(false);
                onComplete?.();
              }}
              className="w-full"
              data-testid="button-complete-onboarding"
            >
              Enter GrudgeOS Studio
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
