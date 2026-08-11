import { useState } from 'react';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { CURRENT_USER } from '../data/profile.js';
import Avatar from '../components/Avatar.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import {
  UserIcon,
  MapPinIcon,
  BellIcon,
  FileTextIcon,
  ShieldIcon,
  ChevronRightIcon,
  LogoutIcon,
} from '../components/icons.jsx';
import './Profile.css';

// Things about *you* first, then things about your *activity* — see the plan
// doc for the full hierarchy rationale.
const MENU = [
  { key: 'personalInformation', label: 'Personal Information', icon: UserIcon },
  { key: 'addresses', label: 'Addresses', icon: MapPinIcon },
  { key: 'notifications', label: 'Notifications', icon: BellIcon },
  { key: 'invoices', label: 'Invoices', icon: FileTextIcon },
  { key: 'requests', label: 'Requests', icon: ShieldIcon },
];

export default function Profile() {
  const { navigate, replace } = useNavigation();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  function handleLogout() {
    setConfirmingLogout(false);
    replace('login');
  }

  return (
    <div className="profile">
      <header className="profile__topbar">
        <h1>Profile</h1>
      </header>

      <main className="profile__content">
        <div className="profile__identity">
          <Avatar initial={CURRENT_USER.avatarInitial} photoUrl={CURRENT_USER.avatarPhoto} size={56} />
          <div className="profile__identity-text">
            <p className="profile__name">
              {CURRENT_USER.firstName} {CURRENT_USER.lastName}
            </p>
            <p className="profile__contact">{CURRENT_USER.phone}</p>
            <p className="profile__contact">{CURRENT_USER.email}</p>
          </div>
        </div>

        <div className="profile__menu">
          {MENU.map(({ key, label, icon: Icon }) => (
            <button key={key} className="profile__row" onClick={() => navigate(key)}>
              <span className="profile__row-icon">
                <Icon width="18" height="18" />
              </span>
              <span className="profile__row-label">{label}</span>
              <ChevronRightIcon className="profile__row-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>

        <button className="profile__logout" onClick={() => setConfirmingLogout(true)}>
          <LogoutIcon width="16" height="16" />
          Logout
        </button>
      </main>

      <ConfirmSheet
        open={confirmingLogout}
        title="Log out?"
        body="You'll need to verify your phone number again next time you open the app."
        confirmLabel="Logout"
        danger
        onConfirm={handleLogout}
        onClose={() => setConfirmingLogout(false)}
      />
    </div>
  );
}
