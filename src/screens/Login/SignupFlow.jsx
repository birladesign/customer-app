import { useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CURRENT_USER } from '../../data/profile.js';
import PhoneStep from './PhoneStep.jsx';
import OtpStep from './OtpStep.jsx';
import OnboardingStep from './OnboardingStep.jsx';

// The signup half of auth, reached via "Sign up instead" on the login
// screen: phone -> otp -> name/details, always — unlike login, a fresh
// signup has nothing on file yet so the details step always runs.
// "Already have an account? Log in" hands back to LoginFlow via
// onSwitchToLogin.
export default function SignupFlow({ onSwitchToLogin }) {
  const { replace } = useNavigation();
  const [step, setStep] = useState('onboarding');
  const [phone, setPhone] = useState('');

  function handlePhoneContinue(value) {
    setPhone(value);
    setStep('otp');
  }

  function handleOtpVerified() {
    setStep('onboarding');
  }

  function handleOnboardingComplete(profile, enteredPhone) {
    // No backend in this prototype — the verified phone plus the details
    // just collected become the app's CURRENT_USER going forward.
    const finalPhone = phone || enteredPhone;
    Object.assign(CURRENT_USER, profile, { phone: finalPhone });
    replace('home');
  }

  function handleSkip() {
    replace('home');
  }

  if (step === 'otp') {
    return <OtpStep phone={phone} onVerified={handleOtpVerified} onBack={() => setStep('phone')} onSkip={handleSkip} />;
  }
  if (step === 'onboarding') {
    return <OnboardingStep phone={phone} onComplete={handleOnboardingComplete} onSwitchToLogin={onSwitchToLogin} />;
  }
  return (
    <PhoneStep
      mode="signup"
      onContinue={handlePhoneContinue}
      onSkip={handleSkip}
      onSwitchMode={onSwitchToLogin}
    />
  );
}
