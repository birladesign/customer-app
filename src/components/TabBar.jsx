import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import './TabBar.css';

export default function TabBar({ tabs, activeTab, onChange, countsByTab }) {
  const reduceMotion = useReducedMotion();
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, top: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      // Anchor to the button's own bottom edge, not the row's padded bottom —
      // otherwise the underline floats a few px below the label instead of
      // hugging it.
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, top: el.offsetTop + el.offsetHeight - 2 });
    }
  }, [activeTab, tabs]);

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          ref={(el) => {
            tabRefs.current[tab.key] = el;
          }}
          className={`tab-bar__tab${activeTab === tab.key ? ' tab-bar__tab--active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {countsByTab[tab.key] > 0 && tab.key === 'action' && (
            <span className="tab-bar__badge">{countsByTab[tab.key]}</span>
          )}
        </button>
      ))}
      <motion.span
        className="tab-bar__indicator"
        animate={{ left: indicator.left, width: indicator.width, top: indicator.top }}
        transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
      />
    </div>
  );
}
