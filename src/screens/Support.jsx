import { useNavigation } from '../navigation/NavigationContext.jsx';
import { HeadsetIcon, HouseIcon } from '../components/icons.jsx';
import './PlaceholderScreen.css';

export default function Support() {
  const { switchTab } = useNavigation();

  return (
    <div className="placeholder-screen">
      <header className="placeholder-screen__topbar">
        <button className="placeholder-screen__icon-btn" onClick={() => switchTab('home')} aria-label="Home">
          <HouseIcon width="18" height="18" />
        </button>
        <h1>Support</h1>
      </header>
      <div className="placeholder-screen__body">
        <span className="placeholder-screen__icon">
          <HeadsetIcon width="24" height="24" />
        </span>
        <p className="placeholder-screen__title">Support is on its way</p>
        <p className="placeholder-screen__description">
          This section is still being built. For now, open any order for help specific to it.
        </p>
      </div>
    </div>
  );
}
