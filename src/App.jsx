import { NavigationProvider } from './navigation/NavigationContext.jsx';
import ScreenStack from './navigation/ScreenStack.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';

export default function App() {
  return (
    <NavigationProvider>
      <PhoneFrame>
        <ScreenStack />
      </PhoneFrame>
    </NavigationProvider>
  );
}
