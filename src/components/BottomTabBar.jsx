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

// A floating glass pill, not a full-width bar — sits above content with
// margin on every side so it reads as its own material layer. The active
// tab is a solid navy capsule that slides and resizes into place (shared
// layout animation) rather than a static tinted highlight; inactive tabs
// stay icon-forward and quiet so the one active destination reads clearly.
// Present on every screen, pushed or not — only hidden while there's no
// tab context at all (login/onboarding).
export default function BottomTabBar() {
  const { activeTab, switchTab } = useNavigation();
  const reduceMotion = useReducedMotion();
  if (!activeTab) return null;

  return (
    <nav className="bottom-tab-bar">
      {TABS.map(({ key, label, Icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            className="bottom-tab-bar__tab"
            onClick={() => switchTab(key)}
            aria-current={active ? 'page' : undefined}
          >
            {active ? (
              <motion.span
                layoutId="bottom-tab-bar__pill"
                className="bottom-tab-bar__pill"
                transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
              >
                <Icon width="18" height="18" strokeWidth={2.4} />
                <span>{label}</span>
              </motion.span>
            ) : (
              <span className="bottom-tab-bar__tab-inactive">
                <Icon width="20" height="20" strokeWidth={2} />
                <span>{label}</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
