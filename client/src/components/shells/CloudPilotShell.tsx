import { Switch, Route } from 'wouter';
import Home from '@/pages/home';
import TreatyPage from '@/pages/treaty';
import GrudgeStudio from '@/pages/grudge-studio';
import NotFound from '@/pages/not-found';

export function CloudPilotShell() {
  return (
    <div className="min-h-screen bg-background" data-testid="shell-cloudpilot">
      <Switch>
        <Route path="/" component={GrudgeStudio} />
        <Route path="/grudge-studio" component={GrudgeStudio} />
        <Route path="/treaty" component={TreatyPage} />
        <Route path="/home" component={Home} />
        <Route path="/cloudpilot" component={Home} />
        <Route path="/cloudpilot/:rest*" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}
