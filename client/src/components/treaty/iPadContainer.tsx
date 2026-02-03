import { ReactNode } from 'react';

interface iPadContainerProps {
  children: ReactNode;
  orientation?: 'landscape' | 'portrait';
}

export function IPadContainer({ children }: iPadContainerProps) {
  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{ background: '#0a0a0f' }}
      data-testid="desktop-viewport"
    >
      <div className="w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
