import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppBoundary } from "@/components/flipflip";
import { CloudPilotShell } from "@/components/shells/CloudPilotShell";
import { ArenaShell } from "@/components/shells/ArenaShell";
import { AIProvider } from "@/contexts/AIContext";
import { AICompanion } from "@/components/ai/AICompanion";
import { SmartSuggestions } from "@/components/ai/SmartSuggestions";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AIProvider>
        <TooltipProvider>
          <Toaster />
          <AppBoundary
            cloudPilotContent={<CloudPilotShell />}
            arenaContent={<ArenaShell />}
          />
          <AICompanion defaultMinimized={false} />
          <SmartSuggestions />
        </TooltipProvider>
      </AIProvider>
    </QueryClientProvider>
  );
}

export default App;
