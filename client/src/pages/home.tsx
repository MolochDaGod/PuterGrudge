import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  useEffect(() => {
    document.title = 'NetGuard AI - Network Superhero Monitor';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-4xl w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/25">
                🦸
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Net<span className="text-blue-500">Guard</span> AI
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your Network Superhero powered by free Puter AI. Monitor network activity, Docker containers, commands, and storage with AI-assisted analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge variant="secondary" className="text-sm py-1.5 px-3">
              Free AI Analysis
            </Badge>
            <Badge variant="secondary" className="text-sm py-1.5 px-3">
              Network Monitoring
            </Badge>
            <Badge variant="secondary" className="text-sm py-1.5 px-3">
              Docker Containers
            </Badge>
            <Badge variant="secondary" className="text-sm py-1.5 px-3">
              Storage Analysis
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="/netguard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full text-lg py-6 px-8" data-testid="button-launch-app">
                Launch NetGuard App
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">🌐</span>
                  Network Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track network interfaces, bridge states, and connection events in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">🐳</span>
                  Docker Containers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor container status, CPU and memory usage across all running containers.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">💻</span>
                  Command Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  See what commands are running, including hidden background processes.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">💾</span>
                  Storage Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Discover what's eating up your disk space with detailed breakdowns.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="pt-8 space-y-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 justify-center">
                  <span className="text-2xl">🤖</span>
                  Powered by Puter AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This app uses Puter.js for free, unlimited AI analysis. No API keys needed - just ask the AI assistant about your network, containers, or storage. It's like having a senior sysadmin on call 24/7.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="pt-4 text-sm text-muted-foreground">
            <p>
              The standalone app can be deployed anywhere - just save the HTML file and upload to any web host.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
