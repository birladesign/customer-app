import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NavigationContext = createContext(null);

// The stack always starts on My Orders — it's the app's only true root;
// there's nothing above it to go back to.
const INITIAL_STACK = [{ screen: 'myOrders', params: {} }];

export function NavigationProvider({ children }) {
  const [stack, setStack] = useState(INITIAL_STACK);

  const navigate = useCallback((screen, params = {}) => {
    setStack((s) => [...s, { screen, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  // Swap the top of the stack without growing it — e.g. a flow finishing and
  // landing on a "done" state without leaving a wizard step behind Back.
  const replace = useCallback((screen, params = {}) => {
    setStack((s) => [...s.slice(0, -1), { screen, params }]);
  }, []);

  const current = stack[stack.length - 1];
  const previous = stack.length > 1 ? stack[stack.length - 2] : null;

  const value = useMemo(
    () => ({
      stack,
      current,
      previous,
      depth: stack.length,
      canGoBack: stack.length > 1,
      navigate,
      goBack,
      replace,
    }),
    [stack, current, previous, navigate, goBack, replace]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider');
  return ctx;
}
