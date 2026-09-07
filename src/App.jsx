import { useEffect } from 'react';
import { NavigationProvider } from './navigation/NavigationContext.jsx';
import ScreenStack from './navigation/ScreenStack.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';
import BottomTabBar from './components/BottomTabBar.jsx';
import { ORDERS } from './data/orders.js';
import { USER_CASES } from './data/support.js';
import { ADDRESSES } from './data/profile.js';
import { snapshot } from './data/persist.js';

export default function App() {
  // Flows mutate the shared fixture arrays in place rather than going through
  // React state, so there's no state update to hook — snapshot on the events
  // that reliably follow a completed action instead: leaving the tab, and
  // hiding it (which is what actually fires on mobile).
  useEffect(() => {
    const save = () => snapshot({ orders: ORDERS, cases: USER_CASES, addresses: ADDRESSES });
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);
    // A periodic save covers the long middle of a session, where someone
    // books three things and never backgrounds the tab before reloading.
    const timer = window.setInterval(save, 5000);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', save);
      window.clearInterval(timer);
      save();
    };
  }, []);

  return (
    <NavigationProvider>
      <PhoneFrame>
        <ScreenStack />
        <BottomTabBar />
      </PhoneFrame>
    </NavigationProvider>
  );
}
