import { useState } from 'react';
import { AlertTriangleIcon } from '../../components/icons.jsx';
import './PhoneStep.css';

// Only Indian mobile numbers (6-9 leading digit, 10 digits) are treated as
// valid — matches the Figma error copy exactly ("Please enter valid phone
// number.") rather than a generic "invalid input" message.
const VALID_PHONE = /^[6-9]\d{9}$/;

export default function PhoneStep({ onContinue, onSkip, onSwitchMode }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(false);

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (error) setError(false);
  }

  function handleContinue() {
    if (!VALID_PHONE.test(phone)) {
      setError(true);
      return;
    }
    onContinue(phone);
  }

  return (
    <div className="phone-step">
      <button className="phone-step__skip" onClick={onSkip}>
        Skip
      </button>

      <div className="phone-step__hero" aria-hidden="true">
        <p className="phone-step__hero-title">Real-time Order Tracking</p>
        <div className="phone-step__hero-image" />
      </div>

      {error && (
        <div className="phone-step__error-banner" role="alert">
          <AlertTriangleIcon width="16" height="16" />
          Please enter valid phone number.
        </div>
      )}

      <div className="phone-step__sheet">
        <h1 className="phone-step__heading">Login</h1>

        <div className={`phone-step__pill${error ? ' phone-step__pill--error' : ''}`}>
          <span className="phone-step__prefix">+91</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            className="phone-step__input"
            placeholder="Phone Number"
            value={phone}
            onChange={handleChange}
            maxLength={10}
          />
        </div>

        <button
          className="phone-step__continue"
          disabled={phone.length !== 10}
          onClick={handleContinue}
        >
          Continue
        </button>

        <button className="phone-step__switch-mode" onClick={onSwitchMode}>
          New here? Sign up instead
        </button>

        <p className="phone-step__terms">
          By continuing, you are agreeing to The Sleep Company's Terms and Privacy Policy
        </p>
      </div>
    </div>
  );
}
