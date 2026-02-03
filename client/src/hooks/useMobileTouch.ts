import { useRef, useCallback, useEffect } from 'react';

/**
 * Mobile Touch Best Practices Hook
 * 
 * Features:
 * - Long press (500ms) triggers right-click/context menu
 * - Prevents default touch behaviors when needed
 * - Handles touch vs mouse differentiation
 * - Double-tap detection
 * - Swipe gesture detection
 */

interface LongPressOptions {
  threshold?: number;
  onLongPress?: (e: TouchEvent | MouseEvent) => void;
  onPress?: (e: TouchEvent | MouseEvent) => void;
  preventDefault?: boolean;
}

export function useLongPress(options: LongPressOptions = {}) {
  const { 
    threshold = 500, 
    onLongPress, 
    onPress,
    preventDefault = true 
  } = options;
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (preventDefault) {
        e.preventDefault();
      }
      onLongPress?.(e.nativeEvent);
    }, threshold);
  }, [threshold, onLongPress, preventDefault]);

  const stop = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (!isLongPressRef.current) {
      onPress?.(e.nativeEvent);
    }
  }, [onPress]);

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = Math.abs(clientX - startPosRef.current.x);
    const dy = Math.abs(clientY - startPosRef.current.y);
    
    if (dx > 10 || dy > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onContextMenu: (e: React.MouseEvent) => {
      if (preventDefault) {
        e.preventDefault();
      }
    }
  };
}

interface SwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipe(options: SwipeOptions = {}) {
  const { 
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  } = options;
  
  const startRef = useRef({ x: 0, y: 0 });
  const endRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    endRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    const dx = endRef.current.x - startRef.current.x;
    const dy = endRef.current.y - startRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > threshold) {
      if (absDx > absDy) {
        if (dx > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        if (dy > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}

export function useDoubleTap(callback: () => void, delay = 300) {
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < delay) {
      callback();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [callback, delay]);

  return {
    onTouchEnd: handleTap
  };
}

export function usePinchZoom(options: { 
  onPinch?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
} = {}) {
  const { onPinch, minScale = 0.5, maxScale = 3 } = options;
  const initialDistanceRef = useRef(0);
  const scaleRef = useRef(1);

  const getDistance = (touches: React.TouchList) => {
    const [t1, t2] = [touches[0], touches[1]];
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistanceRef.current = getDistance(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistanceRef.current > 0) {
      const currentDistance = getDistance(e.touches);
      const newScale = Math.min(maxScale, Math.max(minScale, 
        scaleRef.current * (currentDistance / initialDistanceRef.current)
      ));
      onPinch?.(newScale);
    }
  }, [onPinch, minScale, maxScale]);

  const handleTouchEnd = useCallback(() => {
    initialDistanceRef.current = 0;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}

export default { useLongPress, useSwipe, useDoubleTap, usePinchZoom };
