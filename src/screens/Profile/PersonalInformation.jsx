import { useState } from 'react';
import { CURRENT_USER } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import { ChevronLeftIcon, CalendarIcon, CheckCircleIcon } from '../../components/icons.jsx';
import './PersonalInformation.css';

export default function PersonalInformation() {
  const { goBack } = useNavigation();
  const [baseline, setBaseline] = useState(CURRENT_USER);
  const [form, setForm] = useState(CURRENT_USER);
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // A new edit always supersedes the previous save's confirmation — never
    // let the button keep claiming "Saved" once there's unsaved input again.
    setSaved(false);
  }

  // Avatar's own live preview is a blob URL, which gets revoked the moment
  // this screen unmounts — so it can't be what persists. Convert to a data
  // URL (survives navigation, can sit in CURRENT_USER as a plain string)
  // and route it through the same update() as every other field, so
  // changing your photo now actually marks the form dirty and Update
  // Profile stops being a dead end for it.
  function handlePhotoChange(file) {
    if (!file) {
      update('avatarPhoto', null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('avatarPhoto', reader.result);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    // No backend in this prototype — mutate the shared CURRENT_USER object in
    // place so every other screen that reads it (e.g. the Profile hub) sees
    // the edit immediately, instead of only updating this component's local
    // state and losing the change the moment this screen unmounts.
    Object.assign(CURRENT_USER, form);
    setBaseline(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="personal-info">
      <header className="personal-info__topbar">
        <button className="personal-info__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Your Profile</h1>
        <span className="personal-info__icon-btn-spacer" />
      </header>

      <main className="personal-info__content">
        <div className="personal-info__avatar-row">
          <Avatar
            initial={form.avatarInitial}
            photoUrl={form.avatarPhoto}
            size={100}
            editable
            onChange={handlePhotoChange}
          />
        </div>

        <div className="personal-info__fields">
          <input
            className="personal-info__pill"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            placeholder="First name"
          />
          <input
            className="personal-info__pill"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            placeholder="Last name"
          />
          <div className="personal-info__field-group">
            <input
              className="personal-info__pill personal-info__pill--disabled"
              value={form.phone}
              disabled
            />
            <p className="personal-info__helper">Registered number can't be changed</p>
          </div>

          <div className="personal-info__pill personal-info__pill--dob">
            <input
              type="date"
              className="personal-info__date-input"
              value={form.dob}
              onChange={(e) => update('dob', e.target.value)}
            />
            <CalendarIcon className="personal-info__dob-icon" width="18" height="18" />
          </div>
        </div>
      </main>

      <div className="personal-info__footer">
        <button
          className={`personal-info__submit${saved ? ' personal-info__submit--saved' : ''}`}
          onClick={handleSubmit}
          disabled={!dirty}
        >
          {saved ? (
            <>
              <CheckCircleIcon width="16" height="16" />
              Saved
            </>
          ) : (
            'Update Profile'
          )}
        </button>
      </div>
    </div>
  );
}
