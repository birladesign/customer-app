import { useEffect, useState } from 'react';
import './LoginHeroAnimation.css';

export default function LoginHeroAnimation() {
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    // 3.0s animation + 1.2s pause = 4.2s loop
    const timer = setInterval(() => setPlayKey((k) => k + 1), 4200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="login-hero-stage">
      <div className="login-hero-va" key={playKey}>
        <h2 className="login-hero-hl">Everything for your order.</h2>
        <div className="login-hero-rule"></div>

        <div className="login-hero-va__row">
          <div className="login-hero-va__item" style={{ '--d': '.60s' }}>
            <div className="login-hero-ico">
              <svg className="login-hero-ic" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <path className="login-hero-dr" pathLength="1" d="M14 22h36v24a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V22Z"/>
                <path className="login-hero-dr" pathLength="1" d="M14 22 19.5 12h25L50 22"/>
                <path className="login-hero-dr" pathLength="1" d="M32 12v10"/>
                <path className="login-hero-dr" pathLength="1" d="M25 32h14"/>
                <path className="login-hero-tk" pathLength="1" d="M17 57h30"/>
                <circle className="login-hero-nd n1" cx="17" cy="57" r="3.2"/>
                <circle className="login-hero-nd n2" cx="32" cy="57" r="3.2"/>
                <circle className="login-hero-nd n3" cx="47" cy="57" r="3.2"/>
              </svg>
            </div>
            <div className="login-hero-lb">Track</div>
            <div className="login-hero-sb">See exactly where it is.</div>
          </div>

          <div className="login-hero-va__item" style={{ '--d': '1.30s' }}>
            <div className="login-hero-ico">
              <svg className="login-hero-ic" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <path className="login-hero-dr" pathLength="1" d="M16 13h32a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H31l-11 9v-9h-4a6 6 0 0 1-6-6V19a6 6 0 0 1 6-6Z"/>
                <circle className="login-hero-dot d1" cx="23" cy="29" r="2.8"/>
                <circle className="login-hero-dot d2" cx="32" cy="29" r="2.8"/>
                <circle className="login-hero-dot d3" cx="41" cy="29" r="2.8"/>
              </svg>
            </div>
            <div className="login-hero-lb">Support</div>
            <div className="login-hero-sb">Real help, one tap away.</div>
          </div>

          <div className="login-hero-va__item" style={{ '--d': '2.00s' }}>
            <div className="login-hero-ico">
              <svg className="login-hero-ic" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <path className="login-hero-dr" pathLength="1" d="M32 9 52 16.5v16.8C52 45.6 43.6 52.3 32 56 20.4 52.3 12 45.6 12 33.3V16.5L32 9Z"/>
                <path className="login-hero-ck" pathLength="1" d="M23 32.5 29.5 39 42 26"/>
              </svg>
            </div>
            <div className="login-hero-lb">Warranties &amp; Repairs</div>
            <div className="login-hero-sb">Covered, long after delivery.</div>
          </div>
        </div>

        <div className="login-hero-foot">All in one place</div>
      </div>
    </div>
  );
}
