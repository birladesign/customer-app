import { useState } from 'react';
import './OnboardingStep.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingStep({ phone, onComplete }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [touchedEmail, setTouchedEmail] = useState(false);

  const emailValid = email.trim() === '' || EMAIL_RE.test(email.trim());
  const canContinue = firstName.trim() !== '' && lastName.trim() !== '' && emailValid;

  function handleContinue() {
    if (!canContinue) return;
    onComplete({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      avatarInitial: firstName.trim().charAt(0).toUpperCase() || 'A',
      dob: '',
    });
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
          <input className="onboarding-step__pill onboarding-step__pill--disabled" value={phone} disabled />
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
      </div>
    </div>
  );
}
