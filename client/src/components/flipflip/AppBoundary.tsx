import { ReactNode } from 'react';
import { FlipFlipProvider, useFlipFlip } from './FlipFlipContext';
import { Layers, Gamepad2 } from 'lucide-react';

interface AppBoundaryProps {
  cloudPilotContent: ReactNode;
  arenaContent: ReactNode;
}

function FlipButton() {
  const { state, toggle } = useFlipFlip();
  const isArena = state.activeSide === 'arena';

  return (
    <button
      onClick={toggle}
      disabled={state.isTransitioning}
      data-testid="btn-flip-context"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-full font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: isArena 
          ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
          : 'linear-gradient(135deg, #e94560, #ff6b8a)',
        boxShadow: isArena 
          ? '0 4px 20px rgba(59, 130, 246, 0.4)' 
          : '0 4px 20px rgba(233, 69, 96, 0.4)',
      }}
    >
      {isArena ? (
        <>
          <Layers className="w-5 h-5" />
          <span>CloudPilot Studio</span>
        </>
      ) : (
        <>
          <Gamepad2 className="w-5 h-5" />
          <span>Arena Games</span>
        </>
      )}
    </button>
  );
}

function BoundaryContent({ cloudPilotContent, arenaContent }: AppBoundaryProps) {
  const { state } = useFlipFlip();

  return (
    <div className="relative w-full min-h-screen">
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: state.activeSide === 'cloudpilot' ? 1 : 0,
          pointerEvents: state.activeSide === 'cloudpilot' ? 'auto' : 'none',
          visibility: state.activeSide === 'cloudpilot' ? 'visible' : 'hidden',
        }}
      >
        {cloudPilotContent}
      </div>

      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: state.activeSide === 'arena' ? 1 : 0,
          pointerEvents: state.activeSide === 'arena' ? 'auto' : 'none',
          visibility: state.activeSide === 'arena' ? 'visible' : 'hidden',
        }}
      >
        {arenaContent}
      </div>

      <FlipButton />

      <div 
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
        style={{
          background: 'rgba(26, 26, 46, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: state.activeSide === 'arena' ? '#e94560' : '#3b82f6',
        }}
      >
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{
            background: state.activeSide === 'arena' ? '#e94560' : '#3b82f6',
          }}
        />
        {state.activeSide === 'arena' ? 'Arena Mode' : 'Studio Mode'}
      </div>
    </div>
  );
}

export function AppBoundary({ cloudPilotContent, arenaContent }: AppBoundaryProps) {
  return (
    <FlipFlipProvider>
      <BoundaryContent 
        cloudPilotContent={cloudPilotContent} 
        arenaContent={arenaContent} 
      />
    </FlipFlipProvider>
  );
}
