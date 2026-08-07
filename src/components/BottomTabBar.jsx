import { motion, useReducedMotion } from 'motion/react';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import { HouseIcon, PackageIcon, HeadsetIcon } from './icons.jsx';
import './BottomTabBar.css';

const TABS = [
  { key: 'home', label: 'Home', Icon: HouseIcon },
  { key: 'orders', label: 'My Orders', Icon: PackageIcon },
  { key: 'support', label: 'Support', Icon: HeadsetIcon },
];

// A floating pill, not a full-width bar — sits above content with margin on
// every side so it reads as its own material layer (glass, elevated shadow)
// rather than a fixed strip the frame is built into. Only visible on a tab's
// own root (depth 1); a pushed screen owns the bottom of the frame instead
// of competing with it.
export default function BottomTabBar() {
  const { depth, activeTab, switchTab } = useNavigation();
  const reduceMotion = useReducedMotion();
  if (depth > 1 || !activeTab) return null;

  return (
    <nav className="bottom-tab-bar">
      {TABS.map(({ key, label, Icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            className={`bottom-tab-bar__tab${active ? ' bottom-tab-bar__tab--active' : ''}`}
            onClick={() => switchTab(key)}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <motion.span
                layoutId="bottom-tab-bar__indicator"
                className="bottom-tab-bar__indicator"
                transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
              />
            )}
            <Icon width="20" height="20" strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
