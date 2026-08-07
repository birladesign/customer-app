import { useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CURRENT_USER } from '../../data/profile.js';
import PhoneStep from './PhoneStep.jsx';
import OtpStep from './OtpStep.jsx';
import OnboardingStep from './OnboardingStep.jsx';

// A single local step machine (phone -> otp -> [onboarding]) rather than
// three separate navigation-stack screens — same pattern as
// ReturnReplaceFlow, and it avoids a confusing Back button mid-verification.
// Only the final step hands off to the real app via replace('home').
export default function LoginFlow() {
  const { replace } = useNavigation();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');

  function handlePhoneContinue(value) {
    setPhone(value);
    setStep('otp');
  }

  function handleOtpVerified() {
    const isReturningUser = phone === CURRENT_USER.phone;
    if (isReturningUser) {
      replace('home');
    } else {
      setStep('onboarding');
    }
  }

  function handleOnboardingComplete(profile) {
    // No backend in this prototype — the verified phone plus the details
    // just collected become the app's CURRENT_USER going forward.
    Object.assign(CURRENT_USER, profile, { phone });
    replace('home');
  }

  function handleSkip() {
    replace('home');
  }

  if (step === 'otp') {
    return <OtpStep phone={phone} onVerified={handleOtpVerified} onBack={() => setStep('phone')} onSkip={handleSkip} />;
  }
  if (step === 'onboarding') {
    return <OnboardingStep phone={phone} onComplete={handleOnboardingComplete} />;
  }
  return <PhoneStep onContinue={handlePhoneContinue} onSkip={handleSkip} />;
}
