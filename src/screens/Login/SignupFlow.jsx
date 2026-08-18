import { useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CURRENT_USER } from '../../data/profile.js';
import SignupForm from './SignupForm.jsx';
import OtpStep from './OtpStep.jsx';

// The signup half of auth, reached via "Sign up instead" on the login
// screen: the full signup form (name, phone, email) is collected up front,
// then OTP verifies the phone from that form, then straight to home.
// "Already have an account? Log in" hands back to LoginFlow via
// onSwitchToLogin.
export default function SignupFlow({ onSwitchToLogin }) {
  const { replace } = useNavigation();
  const [step, setStep] = useState('form');
  const [profile, setProfile] = useState(null);

  function handleFormContinue(collectedProfile) {
    setProfile(collectedProfile);
    setStep('otp');
  }

  function handleOtpVerified() {
    // No backend in this prototype — the details collected on the form,
    // now phone-verified, become the app's CURRENT_USER going forward.
    Object.assign(CURRENT_USER, profile);
    replace('home');
  }

  function handleSkip() {
    replace('home');
  }

  if (step === 'otp') {
    return (
      <OtpStep phone={profile.phone} onVerified={handleOtpVerified} onBack={() => setStep('form')} onSkip={handleSkip} />
    );
  }
  return <SignupForm onContinue={handleFormContinue} onSwitchToLogin={onSwitchToLogin} />;
}
