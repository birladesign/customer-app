import { useEffect, useRef, useState } from 'react';
import { AlertTriangleIcon, ChevronLeftIcon, EditIcon } from '../../components/icons.jsx';
import './OtpStep.css';

// No backend in this prototype — a fixed mock code stands in for a real SMS
// OTP, shown as an explicit demo hint rather than hidden (this app never
// pretends its mocked contracts are real, per the rest of the session).
const MOCK_OTP = '123456';
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

function formatPhone(phone) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export default function OtpStep({ phone, onVerified, onBack, onSkip }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  // idle | verifying | invalid | locked
  const [status, setStatus] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => setLockoutRemaining((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  useEffect(() => {
    if (status === 'locked' && lockoutRemaining === 0) {
      setStatus('idle');
      setAttempts(0);
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [lockoutRemaining, status]);

  function verify(code) {
    setStatus('verifying');
    // Simulated network delay — long enough that the "Verifying..." state is
    // actually visible rather than a flash.
    setTimeout(() => {
      if (code === MOCK_OTP) {
        onVerified();
        return;
      }
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setDigits(Array(6).fill(''));
      if (nextAttempts >= MAX_ATTEMPTS) {
        setStatus('locked');
        setLockoutRemaining(LOCKOUT_SECONDS);
      } else {
        setStatus('invalid');
        inputRefs.current[0]?.focus();
      }
    }, 900);
  }

  function updateDigit(index, rawValue) {
    if (status === 'verifying' || status === 'locked') return;
    const clean = rawValue.replace(/\D/g, '');
    const next = [...digits];
    if (!clean) {
      next[index] = '';
      setDigits(next);
      return;
    }
    next[index] = clean[clean.length - 1];
    setDigits(next);
    if (status === 'invalid') setStatus('idle');
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (next.every(Boolean)) {
      verify(next.join(''));
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text || status === 'verifying' || status === 'locked') return;
    e.preventDefault();
    const next = Array(6).fill('');
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    if (text.length === 6) {
      verify(text);
    } else {
      inputRefs.current[text.length]?.focus();
    }
  }

  function handleResend() {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStatus('idle');
    setAttempts(0);
    setDigits(Array(6).fill(''));
    inputRefs.current[0]?.focus();
  }

  const isInvalid = status === 'invalid' || status === 'locked';

  return (
    <div className="otp-step">
      <div className="otp-step__hero" aria-hidden="true">
        <div className="otp-step__hero-image" />
      </div>

      <div className="otp-step__sheet">
        <header className="otp-step__topbar">
          <button className="otp-step__icon-btn" onClick={onBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
        </header>

        {isInvalid && (
          <div className="otp-step__error-banner" role="alert">
            <AlertTriangleIcon width="16" height="16" />
            {status === 'locked'
              ? `Too many incorrect attempts. Try again in ${lockoutRemaining}s.`
              : 'The OTP entered is incorrect/invalid. Please try again.'}
          </div>
        )}

        <main className="otp-step__content">
          <h1 className="otp-step__heading">OTP Verification</h1>
          <p className="otp-step__subtext">
            We have sent a verification code to {formatPhone(phone)}
            <button className="otp-step__edit-phone" onClick={onBack} aria-label="Edit phone number">
              <EditIcon width="14" height="14" />
            </button>
          </p>

          <div className={`otp-step__boxes${isInvalid ? ' otp-step__boxes--error' : ''}`}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="otp-step__box"
                placeholder="0"
                value={digit}
                disabled={status === 'verifying' || status === 'locked'}
                onChange={(e) => updateDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {status === 'verifying' && <p className="otp-step__verifying">Verifying...</p>}

          <div className="otp-step__resend-row">
            <span>Didn't get the OTP?</span>
            {cooldown > 0 ? (
              <span className="otp-step__resend-timer">Resend SMS in {cooldown}s</span>
            ) : (
              <button className="otp-step__resend-btn" onClick={handleResend}>
                Resend SMS
              </button>
            )}
          </div>

          <p className="otp-step__hint">Demo mode — use 123456</p>
        </main>
      </div>
    </div>
  );
}
