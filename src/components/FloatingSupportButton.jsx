import { useNavigation } from '../navigation/NavigationContext.jsx';
import { HeadsetIcon } from './icons.jsx';
import './FloatingSupportButton.css';

// Replaces the persistent bottom tab bar's Support entry — a single floating
// affordance instead of a full nav bar, per the simplified nav direction.
// Same visibility rule the tab bar used (tab-root screens only), and hidden
// on Support itself since floating a button to the screen you're on is dead
// weight.
export default function FloatingSupportButton() {
  const { depth, activeTab, switchTab } = useNavigation();
  if (depth > 1 || !activeTab || activeTab === 'support') return null;

  return (
    <button className="floating-support-btn" onClick={() => switchTab('support')} aria-label="Support">
      <HeadsetIcon width="22" height="22" />
    </button>
  );
}
