import { NavigationProvider } from './navigation/NavigationContext.jsx';
import ScreenStack from './navigation/ScreenStack.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';
import FloatingSupportButton from './components/FloatingSupportButton.jsx';

export default function App() {
  return (
    <NavigationProvider>
      <PhoneFrame>
        <ScreenStack />
        <FloatingSupportButton />
      </PhoneFrame>
    </NavigationProvider>
  );
}
