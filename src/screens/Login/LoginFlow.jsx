import { useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CURRENT_USER } from '../../data/profile.js';
import PhoneStep from './PhoneStep.jsx';
import OtpStep from './OtpStep.jsx';
import SignupFlow from './SignupFlow.jsx';

// Login and signup are separate flows reached from the same screen: this is
// the login half (phone -> otp -> done, no name/details — a returning
// user's details are already on file) with a "Sign up instead" link that
// switches over to SignupFlow, which owns its own form -> otp steps. A
// single local step machine rather than navigation-stack screens — same
// pattern as ReturnReplaceFlow, and it avoids a confusing Back button
// mid-verification. Only the final step hands off to the real app via
// replace('home').
export default function LoginFlow() {
  const { replace } = useNavigation();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');

  function handlePhoneContinue(value) {
    setPhone(value);
    setStep('otp');
  }

  function handleOtpVerified() {
    // No backend in this prototype — the verified phone becomes the app's
    // CURRENT_USER phone going forward, same as SignupFlow does.
    Object.assign(CURRENT_USER, { phone });
    replace('home');
  }

  function handleSkip() {
    replace('home');
  }

  if (mode === 'signup') {
    return <SignupFlow onSwitchToLogin={() => setMode('login')} />;
  }

  if (step === 'otp') {
    return <OtpStep phone={phone} onVerified={handleOtpVerified} onBack={() => setStep('phone')} onSkip={handleSkip} />;
  }
  return <PhoneStep onContinue={handlePhoneContinue} onSkip={handleSkip} onSwitchMode={() => setMode('signup')} />;
}
