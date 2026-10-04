import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

// Exp 4: useReducer + Context for small pop-up notifications.
const ToastContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return [...state, action.toast];
    case 'remove':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const push = useCallback((kind, message) => {
    const id = nextId++;
    dispatch({ type: 'add', toast: { id, kind, message } });
    setTimeout(() => dispatch({ type: 'remove', id }), 4000);
  }, []);

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ul className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <li key={t.id} className={`toast toast-${t.kind}`}>
            <span>{t.kind === 'success' ? '✅' : t.kind === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span>{t.message}</span>
            <button aria-label="Dismiss" onClick={() => dispatch({ type: 'remove', id: t.id })}>×</button>
          </li>
        ))}
      </ul>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
