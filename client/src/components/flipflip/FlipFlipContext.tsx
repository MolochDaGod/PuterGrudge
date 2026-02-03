import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';

type Side = 'cloudpilot' | 'arena';

interface FlipFlipState {
  activeSide: Side;
  isTransitioning: boolean;
  lastCloudPilotRoute: string;
  lastArenaRoute: string;
}

interface FlipFlipContextValue {
  state: FlipFlipState;
  flipTo: (side: Side, options?: FlipOptions) => Promise<void>;
  toggle: () => Promise<void>;
}

interface FlipOptions {
  targetRoute?: string;
  preserveScroll?: boolean;
  onMidpoint?: () => void;
}

const FlipFlipContext = createContext<FlipFlipContextValue | null>(null);

interface FlipFlipProviderProps {
  children: ReactNode;
  initialSide?: Side;
}

class FlipFlipTransition {
  private overlay: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private isTransitioning = false;
  private duration = 600;
  private glowColor = '#e94560';

  constructor() {
    this.init();
  }

  private init() {
    this.createOverlay();
  }

  private createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'flipflip-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease-out;
      background: transparent;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width: 100%; height: 100%;';
    this.overlay.appendChild(this.canvas);

    document.body.appendChild(this.overlay);
    this.initWebGL();
  }

  private initWebGL() {
    if (!this.canvas) return;
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
  }

  async transition(direction: 'forward' | 'backward', onMidpoint?: () => void): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.overlay) {
      this.overlay.style.opacity = '1';
      this.overlay.style.pointerEvents = 'all';
    }

    await this.runAnimation('in');
    
    if (onMidpoint) {
      onMidpoint();
    }

    await new Promise(r => setTimeout(r, 50));

    await this.runAnimation('out');

    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.pointerEvents = 'none';
    }

    this.isTransitioning = false;
  }

  private runAnimation(phase: 'in' | 'out'): Promise<void> {
    return new Promise(resolve => {
      const card = document.createElement('div');
      const isIn = phase === 'in';
      
      card.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 85vw;
        height: 85vh;
        max-width: 1200px;
        max-height: 800px;
        transform: translate(-50%, -50%) perspective(1200px) rotateY(${isIn ? '0' : '90'}deg) scale(${isIn ? '1' : '0.9'});
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        border-radius: 24px;
        box-shadow: 
          0 0 80px rgba(233, 69, 96, 0.4),
          0 25px 50px rgba(0, 0, 0, 0.5),
          inset 0 0 60px rgba(233, 69, 96, 0.1);
        z-index: 100000;
        opacity: ${isIn ? '0' : '1'};
        overflow: hidden;
        backface-visibility: hidden;
      `;

      const innerGlow = document.createElement('div');
      innerGlow.style.cssText = `
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at center, rgba(233, 69, 96, 0.15) 0%, transparent 70%);
        pointer-events: none;
      `;
      card.appendChild(innerGlow);

      const logo = document.createElement('div');
      logo.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
      `;
      logo.innerHTML = `
        <div style="
          width: 120px;
          height: 120px;
          margin: 0 auto 24px;
          background: linear-gradient(135deg, #e94560, #ff6b8a);
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 40px rgba(233, 69, 96, 0.5);
          animation: pulse 1.5s ease-in-out infinite;
        ">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div style="
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 20px rgba(233, 69, 96, 0.5);
          letter-spacing: -0.5px;
        ">CloudPilot AI</div>
        <div style="
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          margin-top: 8px;
        ">Switching contexts...</div>
      `;
      card.appendChild(logo);

      const particles = document.createElement('div');
      particles.style.cssText = 'position: absolute; inset: 0; pointer-events: none; overflow: hidden;';
      for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 4 + 2;
        p.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          background: rgba(233, 69, 96, ${Math.random() * 0.5 + 0.3});
          border-radius: 50%;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          animation: float ${Math.random() * 3 + 2}s ease-in-out infinite;
          animation-delay: ${Math.random() * 2}s;
        `;
        particles.appendChild(p);
      }
      card.appendChild(particles);

      if (this.overlay) {
        this.overlay.appendChild(card);
      }

      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      requestAnimationFrame(() => {
        card.style.transition = `all ${this.duration / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        card.style.transform = `translate(-50%, -50%) perspective(1200px) rotateY(${isIn ? '90' : '0'}deg) scale(${isIn ? '0.9' : '1'})`;
        card.style.opacity = isIn ? '1' : '0';
      });

      setTimeout(() => {
        card.remove();
        style.remove();
        resolve();
      }, this.duration / 2);
    });
  }

  destroy() {
    if (this.overlay) {
      this.overlay.remove();
    }
  }
}

export function FlipFlipProvider({ children, initialSide = 'cloudpilot' }: FlipFlipProviderProps) {
  const flipflipRef = useRef<FlipFlipTransition | null>(null);
  const [state, setState] = useState<FlipFlipState>({
    activeSide: initialSide,
    isTransitioning: false,
    lastCloudPilotRoute: '/',
    lastArenaRoute: '/arena',
  });

  useEffect(() => {
    flipflipRef.current = new FlipFlipTransition();
    return () => {
      flipflipRef.current?.destroy();
    };
  }, []);

  const flipTo = useCallback(async (side: Side, options: FlipOptions = {}) => {
    if (state.isTransitioning || state.activeSide === side) return;

    setState(prev => ({ ...prev, isTransitioning: true }));

    const currentRoute = window.location.pathname;
    
    await flipflipRef.current?.transition('forward', () => {
      setState(prev => ({
        ...prev,
        activeSide: side,
        ...(state.activeSide === 'cloudpilot' 
          ? { lastCloudPilotRoute: currentRoute }
          : { lastArenaRoute: currentRoute }
        ),
      }));
      
      options.onMidpoint?.();
    });

    setState(prev => ({ ...prev, isTransitioning: false }));
  }, [state.activeSide, state.isTransitioning]);

  const toggle = useCallback(async () => {
    const nextSide = state.activeSide === 'cloudpilot' ? 'arena' : 'cloudpilot';
    await flipTo(nextSide);
  }, [state.activeSide, flipTo]);

  return (
    <FlipFlipContext.Provider value={{ state, flipTo, toggle }}>
      {children}
    </FlipFlipContext.Provider>
  );
}

export function useFlipFlip() {
  const context = useContext(FlipFlipContext);
  if (!context) {
    throw new Error('useFlipFlip must be used within FlipFlipProvider');
  }
  return context;
}

export type { Side, FlipFlipState, FlipOptions };
