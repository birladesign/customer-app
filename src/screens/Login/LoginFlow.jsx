import { useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CURRENT_USER } from '../../data/profile.js';
import { ORDERS } from '../../data/orders.js';
import PhoneStep from './PhoneStep.jsx';
import OtpStep from './OtpStep.jsx';
import SignupFlow from './SignupFlow.jsx';

// A single local step machine (phone -> otp -> [signup]) rather than three
// separate navigation-stack screens — same pattern as ReturnReplaceFlow, and
// it avoids a confusing Back button mid-verification. Phone + OTP entry is
// shared by login and signup (one "Login or sign up" field, per the Figma
// copy); OTP verification is what decides which of the two the phone
// belongs to. A verified phone that already has an account is a login and
// goes straight to home — the name/details section is only ever shown to a
// phone with no existing account, since a returning user's details are
// already on file. Only the final step hands off to the real app via
// replace('home').
export default function LoginFlow() {
  const { replace } = useNavigation();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');

  function handlePhoneContinue(value) {
    setPhone(value);
    setStep('otp');
  }

  function handleOtpVerified() {
    // A customer who has already punched an order is a known account —
    // skip asking for their name again, same as an exact phone match.
    const hasPlacedOrder = ORDERS.length > 0;
    const isReturningUser = phone === CURRENT_USER.phone || hasPlacedOrder;
    if (isReturningUser) {
      replace('home');
    } else {
      setStep('signup');
    }
  }

  function handleSignupComplete(profile) {
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
  if (step === 'signup') {
    return <SignupFlow phone={phone} onComplete={handleSignupComplete} />;
  }
  return <PhoneStep onContinue={handlePhoneContinue} onSkip={handleSkip} />;
}
