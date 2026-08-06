import { NavigationProvider } from './navigation/NavigationContext.jsx';
import ScreenStack from './navigation/ScreenStack.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';
import BottomTabBar from './components/BottomTabBar.jsx';

export default function App() {
  return (
    <NavigationProvider>
      <PhoneFrame>
        <ScreenStack />
        <BottomTabBar />
      </PhoneFrame>
    </NavigationProvider>
  );
}
