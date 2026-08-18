import OnboardingStep from './OnboardingStep.jsx';

// The new-account half of sign up (post-OTP): collects name/details for a
// phone that didn't match an existing account. Kept separate from
// LoginFlow so the "returning user, skip straight to home" path and the
// "new user, gather details" path aren't tangled in one component.
export default function SignupFlow({ phone, onComplete }) {
  return <OnboardingStep phone={phone} onComplete={onComplete} />;
}
