import { useState, useRef, useCallback, ReactNode } from 'react';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import { WindowState, useWindowManager } from './WindowManager';

interface WindowShellProps {
  window: WindowState;
  children: ReactNode;
  containerBounds?: { width: number; height: number };
}

export function WindowShell({ window, children, containerBounds }: WindowShellProps) {
  const { closeWindow, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow, resizeWindow } = useWindowManager();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-window-control]')) return;
    e.preventDefault();
    focusWindow(window.id);
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - window.x,
      y: e.clientY - window.y,
    };

    const handleMouseMove = (e: MouseEvent) => {
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;
      if (containerBounds) {
        newX = Math.max(0, Math.min(newX, containerBounds.width - window.width));
        newY = Math.max(0, Math.min(newY, containerBounds.height - 40));
      }
      moveWindow(window.id, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [window.id, window.x, window.y, window.width, focusWindow, moveWindow, containerBounds]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    focusWindow(window.id);
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: window.width,
      height: window.height,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = resizeStart.current.width + (e.clientX - resizeStart.current.x);
      const newHeight = resizeStart.current.height + (e.clientY - resizeStart.current.y);
      resizeWindow(window.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [window.id, window.width, window.height, focusWindow, resizeWindow]);

  if (window.isMinimized) return null;

  const style = window.isMaximized
    ? { top: 0, left: 0, width: '100%', height: '100%', zIndex: window.zIndex }
    : { top: window.y, left: window.x, width: window.width, height: window.height, zIndex: window.zIndex };

  return (
    <div
      className={`absolute flex flex-col rounded-lg overflow-hidden shadow-2xl border transition-shadow ${
        window.isFocused ? 'border-[#8b5cf6]/50 shadow-[#8b5cf6]/20' : 'border-[#2a2a3a]'
      }`}
      style={{
        ...style,
        background: 'linear-gradient(180deg, #1a1a25 0%, #12121a 100%)',
      }}
      onClick={() => focusWindow(window.id)}
      data-testid={`window-${window.id}`}
    >
      <div
        className={`h-9 flex items-center justify-between px-3 cursor-move select-none ${
          window.isFocused ? 'bg-[#1f1f2e]' : 'bg-[#16161f]'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{window.icon}</span>
          <span className="text-sm font-medium text-[#e8e8ff] truncate max-w-[200px]">{window.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            data-window-control
            onClick={() => minimizeWindow(window.id)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            data-testid={`window-minimize-${window.id}`}
          >
            <Minus className="w-3 h-3 text-[#8b8b9b]" />
          </button>
          <button
            data-window-control
            onClick={() => window.isMaximized ? restoreWindow(window.id) : maximizeWindow(window.id)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            data-testid={`window-maximize-${window.id}`}
          >
            {window.isMaximized ? (
              <Square className="w-3 h-3 text-[#8b8b9b]" />
            ) : (
              <Maximize2 className="w-3 h-3 text-[#8b8b9b]" />
            )}
          </button>
          <button
            data-window-control
            onClick={() => closeWindow(window.id)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors"
            data-testid={`window-close-${window.id}`}
          >
            <X className="w-3 h-3 text-[#8b8b9b] hover:text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#0f0f18]">
        {children}
      </div>

      {!window.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #8b5cf6 50%)',
            borderRadius: '0 0 8px 0',
          }}
        />
      )}
    </div>
  );
}
