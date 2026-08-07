import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NavigationContext = createContext(null);

// Home/Orders/Support/Profile are peer tab roots — switching tabs resets the
// stack to that tab's single root entry, it never pushes. Screens reached by
// drilling in (orderDetails/returnReplace/paymentDetails) are pushed on top
// of whichever tab root is currently active and hide the tab bar (see
// BottomTabBar, which checks depth === 1) while they're showing.
const ROOT_SCREEN_BY_TAB = { home: 'home', orders: 'myOrders', support: 'support', profile: 'profile' };
const TAB_BY_ROOT_SCREEN = Object.fromEntries(Object.entries(ROOT_SCREEN_BY_TAB).map(([tab, screen]) => [screen, tab]));

// Login is the app's true root when unauthenticated — nothing above it to go
// back to. A successful login/onboarding replaces it with 'home' (see
// LoginFlow), and Logout replaces 'home' back with 'login' the same way.
// Neither is a tab root (see ROOT_SCREEN_BY_TAB above), so activeTab is null
// while here and BottomTabBar stays hidden without any special-casing.
const INITIAL_STACK = [{ screen: 'login', params: {} }];

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

  // A tab switch is a hard reset to that tab's root, not a push — no per-tab
  // history is kept (this app already accepts deep state resetting on
  // navigation elsewhere, e.g. Return & Replace's wizard step).
  const switchTab = useCallback((tabKey) => {
    const screen = ROOT_SCREEN_BY_TAB[tabKey];
    if (screen) setStack([{ screen, params: {} }]);
  }, []);

  const current = stack[stack.length - 1];
  const previous = stack.length > 1 ? stack[stack.length - 2] : null;
  const activeTab = TAB_BY_ROOT_SCREEN[stack[0].screen] ?? null;

  const value = useMemo(
    () => ({
      stack,
      current,
      previous,
      depth: stack.length,
      canGoBack: stack.length > 1,
      activeTab,
      navigate,
      goBack,
      replace,
      switchTab,
    }),
    [stack, current, previous, activeTab, navigate, goBack, replace, switchTab]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider');
  return ctx;
}
