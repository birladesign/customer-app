import { UserIcon } from '../components/icons.jsx';
import './PlaceholderScreen.css';

export default function Profile() {
  return (
    <div className="placeholder-screen">
      <header className="placeholder-screen__topbar">
        <h1>Profile</h1>
      </header>
      <div className="placeholder-screen__body">
        <span className="placeholder-screen__icon">
          <UserIcon width="24" height="24" />
        </span>
        <p className="placeholder-screen__title">Profile is on its way</p>
        <p className="placeholder-screen__description">
          Account details, addresses, and preferences will live here.
        </p>
      </div>
    </div>
  );
}
