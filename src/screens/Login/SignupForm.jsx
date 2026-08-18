import { useState } from 'react';
import { AlertTriangleIcon } from '../../components/icons.jsx';
import './SignupForm.css';

// Only Indian mobile numbers (6-9 leading digit, 10 digits) are treated as
// valid — matches PhoneStep's rule and the Figma error copy.
const VALID_PHONE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The signup half of auth collects every detail up front — name, phone,
// email — before OTP verification, unlike login which only needs a phone.
export default function SignupForm({ onContinue, onSwitchToLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [touchedPhone, setTouchedPhone] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);

  const phoneValid = VALID_PHONE.test(phone);
  const emailValid = email.trim() === '' || EMAIL_RE.test(email.trim());
  const canContinue = firstName.trim() !== '' && lastName.trim() !== '' && phoneValid && emailValid;

  function handlePhoneChange(e) {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
  }

  function handleContinue() {
    if (!canContinue) return;
    onContinue({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone,
      avatarInitial: firstName.trim().charAt(0).toUpperCase() || 'A',
      dob: '',
    });
  }

  return (
    <div className="signup-form">
      <main className="signup-form__content">
        <div className="signup-form__heading-block">
          <h1>Sign up</h1>
          <p>Tell us a bit about yourself to create your account</p>
        </div>

        <div className="signup-form__fields">
          <input
            className="signup-form__pill"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="signup-form__pill"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <div className={`signup-form__phone-pill${touchedPhone && !phoneValid ? ' signup-form__pill--error' : ''}`}>
            <span className="signup-form__phone-prefix">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              className="signup-form__phone-input"
              placeholder="Phone Number"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={() => setTouchedPhone(true)}
              maxLength={10}
            />
          </div>
          {touchedPhone && !phoneValid && (
            <p className="signup-form__error">
              <AlertTriangleIcon width="14" height="14" />
              Please enter a valid phone number.
            </p>
          )}
          <input
            className={`signup-form__pill${touchedEmail && !emailValid ? ' signup-form__pill--error' : ''}`}
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouchedEmail(true)}
          />
          {touchedEmail && !emailValid && <p className="signup-form__error">Enter a valid email address.</p>}
        </div>
      </main>

      <div className="signup-form__footer">
        <button className="signup-form__continue" disabled={!canContinue} onClick={handleContinue}>
          Continue
        </button>
        <button className="signup-form__switch-mode" onClick={onSwitchToLogin}>
          Already have an account? Log in
        </button>
      </div>
    </div>
  );
}
