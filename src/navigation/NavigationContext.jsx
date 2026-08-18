import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const NavigationContext = createContext(null);

// Home/Orders/Support/Profile are peer tab roots — switching tabs resets the
// stack to that tab's single root entry, it never pushes. Screens reached by
// drilling in (orderDetails/returnReplace/paymentDetails) are pushed on top
// of whichever tab root is currently active and hide the tab bar (see
// BottomTabBar, which checks depth === 1) while they're showing.
const ROOT_SCREEN_BY_TAB = { home: 'home', orders: 'myOrders', support: 'support', profile: 'profile' };
const TAB_BY_ROOT_SCREEN = Object.fromEntries(Object.entries(ROOT_SCREEN_BY_TAB).map(([tab, screen]) => [screen, tab]));

// Directly land on home tab root.
const INITIAL_STACK = [{ screen: 'home', params: {}, key: 'tab-home' }];

export function NavigationProvider({ children }) {
  const [stack, setStack] = useState(INITIAL_STACK);
  // An escape hatch for a screen that needs the tab bar gone without pushing
  // a new route — e.g. Support's inline chat, which stays at the tab root
  // (depth never changes) but still wants the full-screen feel of a
  // conversation. Resets to false on tab switch so it can never leak onto a
  // different tab's root.
  const [hideTabBar, setHideTabBar] = useState(false);
  // ScreenStack keys its AnimatePresence entry off each stack entry's `key`
  // rather than depth+screen name — two separate pushes of the same screen
  // at the same depth (e.g. "View Slot" on one order, then again on
  // another) would otherwise share a key, and React would reuse the old
  // component instance instead of mounting a fresh one, leaking stale
  // useState values across visits. Tab roots are the deliberate exception:
  // they keep a stable per-tab key so switching away and back preserves
  // that tab's own scroll/filter state, same as a native tab bar.
  const nextPushKeyRef = useRef(1);

  const navigate = useCallback((screen, params = {}) => {
    const key = `push-${nextPushKeyRef.current++}`;
    setStack((s) => [...s, { screen, params, key }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  // Swap the top of the stack without growing it — e.g. a flow finishing and
  // landing on a "done" state without leaving a wizard step behind Back.
  const replace = useCallback((screen, params = {}) => {
    const key = `push-${nextPushKeyRef.current++}`;
    setStack((s) => [...s.slice(0, -1), { screen, params, key }]);
  }, []);

  // A tab switch is a hard reset to that tab's root, not a push — no per-tab
  // history is kept (this app already accepts deep state resetting on
  // navigation elsewhere, e.g. Return & Replace's wizard step). params lets a
  // cross-tab deep link hand the destination tab root some initial state,
  // same idea as navigate's params.
  const switchTab = useCallback((tabKey, params = {}) => {
    const screen = ROOT_SCREEN_BY_TAB[tabKey];
    if (screen) {
      setStack([{ screen, params, key: `tab-${screen}` }]);
      setHideTabBar(false);
    }
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
      hideTabBar,
      setHideTabBar,
    }),
    [stack, current, previous, activeTab, navigate, goBack, replace, switchTab, hideTabBar]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider');
  return ctx;
}
