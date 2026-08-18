import { useState } from 'react';
import './OnboardingStep.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PHONE = /^[6-9]\d{9}$/;

export default function OnboardingStep({ phone: initialPhone, onComplete, onSwitchToLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [email, setEmail] = useState('');
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPhone, setTouchedPhone] = useState(false);

  const phoneValid = VALID_PHONE.test(phone);
  const emailValid = email.trim() === '' || EMAIL_RE.test(email.trim());
  const canContinue = firstName.trim() !== '' && lastName.trim() !== '' && phoneValid && emailValid;

  function handleContinue() {
    if (!canContinue) return;
    onComplete({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      avatarInitial: firstName.trim().charAt(0).toUpperCase() || 'A',
      dob: '',
    }, phone);
  }

  return (
    <div className="onboarding-step">
      <main className="onboarding-step__content">
        <div className="onboarding-step__heading-block">
          <h1>Setup your profile</h1>
          <p>Last few details needed to create your account</p>
        </div>

        <div className="onboarding-step__fields">
          <input
            className="onboarding-step__pill"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="onboarding-step__pill"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          {initialPhone ? (
            <input className="onboarding-step__pill onboarding-step__pill--disabled" value={initialPhone} disabled />
          ) : (
            <>
              <input
                type="tel"
                className={`onboarding-step__pill${touchedPhone && !phoneValid ? ' onboarding-step__pill--error' : ''}`}
                placeholder="Phone number"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  if (touchedPhone) setTouchedPhone(false);
                }}
                onBlur={() => setTouchedPhone(true)}
              />
              {touchedPhone && !phoneValid && (
                <p className="onboarding-step__error">Please enter valid phone number.</p>
              )}
            </>
          )}
          <input
            className={`onboarding-step__pill${touchedEmail && !emailValid ? ' onboarding-step__pill--error' : ''}`}
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouchedEmail(true)}
          />
          {touchedEmail && !emailValid && (
            <p className="onboarding-step__error">Enter a valid email address.</p>
          )}
        </div>
      </main>

      <div className="onboarding-step__footer">
        <button className="onboarding-step__continue" disabled={!canContinue} onClick={handleContinue}>
          Continue
        </button>
        {onSwitchToLogin && (
          <button className="onboarding-step__switch-mode" onClick={onSwitchToLogin}>
            Already have an account? Log in
          </button>
        )}
      </div>
    </div>
  );
}
