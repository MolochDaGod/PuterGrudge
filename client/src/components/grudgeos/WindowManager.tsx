import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

export interface WindowState {
  id: string;
  title: string;
  icon: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;
  component: string;
  props?: Record<string, any>;
}

interface WindowManagerState {
  windows: WindowState[];
  nextZIndex: number;
}

type WindowAction =
  | { type: 'OPEN_WINDOW'; payload: Partial<WindowState> & { id: string; title: string; component: string } }
  | { type: 'CLOSE_WINDOW'; payload: string }
  | { type: 'FOCUS_WINDOW'; payload: string }
  | { type: 'MINIMIZE_WINDOW'; payload: string }
  | { type: 'MAXIMIZE_WINDOW'; payload: string }
  | { type: 'RESTORE_WINDOW'; payload: string }
  | { type: 'MOVE_WINDOW'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_WINDOW'; payload: { id: string; width: number; height: number } };

const initialState: WindowManagerState = {
  windows: [],
  nextZIndex: 100,
};

function windowReducer(state: WindowManagerState, action: WindowAction): WindowManagerState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const existing = state.windows.find(w => w.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          windows: state.windows.map(w =>
            w.id === action.payload.id
              ? { ...w, isMinimized: false, isFocused: true, zIndex: state.nextZIndex }
              : { ...w, isFocused: false }
          ),
          nextZIndex: state.nextZIndex + 1,
        };
      }
      const newWindow: WindowState = {
        id: action.payload.id,
        title: action.payload.title,
        icon: action.payload.icon || null,
        x: action.payload.x ?? 100 + (state.windows.length * 30),
        y: action.payload.y ?? 80 + (state.windows.length * 30),
        width: action.payload.width ?? 600,
        height: action.payload.height ?? 400,
        minWidth: action.payload.minWidth ?? 300,
        minHeight: action.payload.minHeight ?? 200,
        isMinimized: false,
        isMaximized: false,
        isFocused: true,
        zIndex: state.nextZIndex,
        component: action.payload.component,
        props: action.payload.props,
      };
      return {
        ...state,
        windows: [...state.windows.map(w => ({ ...w, isFocused: false })), newWindow],
        nextZIndex: state.nextZIndex + 1,
      };
    }
    case 'CLOSE_WINDOW':
      return {
        ...state,
        windows: state.windows.filter(w => w.id !== action.payload),
      };
    case 'FOCUS_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload
            ? { ...w, isFocused: true, zIndex: state.nextZIndex }
            : { ...w, isFocused: false }
        ),
        nextZIndex: state.nextZIndex + 1,
      };
    case 'MINIMIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload ? { ...w, isMinimized: true, isFocused: false } : w
        ),
      };
    case 'MAXIMIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload ? { ...w, isMaximized: true, isFocused: true, zIndex: state.nextZIndex } : { ...w, isFocused: false }
        ),
        nextZIndex: state.nextZIndex + 1,
      };
    case 'RESTORE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload ? { ...w, isMaximized: false, isMinimized: false, isFocused: true, zIndex: state.nextZIndex } : { ...w, isFocused: false }
        ),
        nextZIndex: state.nextZIndex + 1,
      };
    case 'MOVE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, x: action.payload.x, y: action.payload.y } : w
        ),
      };
    case 'RESIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id
            ? { ...w, width: Math.max(w.minWidth, action.payload.width), height: Math.max(w.minHeight, action.payload.height) }
            : w
        ),
      };
    default:
      return state;
  }
}

interface WindowManagerContextValue {
  windows: WindowState[];
  openWindow: (config: Partial<WindowState> & { id: string; title: string; component: string }) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(windowReducer, initialState);

  const openWindow = useCallback((config: Partial<WindowState> & { id: string; title: string; component: string }) => {
    dispatch({ type: 'OPEN_WINDOW', payload: config });
  }, []);

  const closeWindow = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_WINDOW', payload: id });
  }, []);

  const focusWindow = useCallback((id: string) => {
    dispatch({ type: 'FOCUS_WINDOW', payload: id });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE_WINDOW', payload: id });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    dispatch({ type: 'MAXIMIZE_WINDOW', payload: id });
  }, []);

  const restoreWindow = useCallback((id: string) => {
    dispatch({ type: 'RESTORE_WINDOW', payload: id });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'MOVE_WINDOW', payload: { id, x, y } });
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    dispatch({ type: 'RESIZE_WINDOW', payload: { id, width, height } });
  }, []);

  return (
    <WindowManagerContext.Provider
      value={{
        windows: state.windows,
        openWindow,
        closeWindow,
        focusWindow,
        minimizeWindow,
        maximizeWindow,
        restoreWindow,
        moveWindow,
        resizeWindow,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within WindowManagerProvider');
  }
  return context;
}
