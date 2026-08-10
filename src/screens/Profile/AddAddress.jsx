import { useState } from 'react';
import { ADDRESSES, CURRENT_USER, addAddress } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { ChevronLeftIcon, HouseIcon } from '../../components/icons.jsx';
import './AddAddress.css';

const LABELS = ['HOME', 'OFFICE', 'OTHER'];

const EMPTY_FORM = {
  label: 'HOME',
  name: `${CURRENT_USER.firstName} ${CURRENT_USER.lastName}`,
  phone: CURRENT_USER.phone,
  line1: '',
  city: '',
  state: '',
  pincode: '',
  makeDefault: ADDRESSES.length === 0,
};

export default function AddAddress() {
  const { goBack } = useNavigation();
  const [form, setForm] = useState(EMPTY_FORM);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const isValid =
    form.name.trim().length > 0 &&
    /^[6-9]\d{9}$/.test(form.phone.trim()) &&
    form.line1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length > 0 &&
    /^\d{6}$/.test(form.pincode.trim());

  function handleSave() {
    addAddress({
      label: form.label,
      isDefault: form.makeDefault,
      name: form.name.trim(),
      lines: [form.line1.trim(), `${form.city.trim()}, ${form.state.trim()}`, form.pincode.trim(), 'India'],
      phone: form.phone.trim(),
    });
    goBack();
  }

  return (
    <div className="add-address">
      <header className="add-address__topbar">
        <button className="add-address__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Add New Address</h1>
        <span className="add-address__icon-btn-spacer" />
      </header>

      <main className="add-address__content">
        <div className="add-address__label-row">
          {LABELS.map((label) => (
            <button
              key={label}
              className={`add-address__label-chip${form.label === label ? ' add-address__label-chip--selected' : ''}`}
              onClick={() => update('label', label)}
            >
              <HouseIcon width="14" height="14" />
              {label}
            </button>
          ))}
        </div>

        <div className="add-address__fields">
          <input
            className="add-address__pill"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <input
            className="add-address__pill"
            type="tel"
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          <input
            className="add-address__pill"
            placeholder="House no., street, area"
            value={form.line1}
            onChange={(e) => update('line1', e.target.value)}
          />
          <input
            className="add-address__pill"
            placeholder="City"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
          />
          <input
            className="add-address__pill"
            placeholder="State"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
          />
          <input
            className="add-address__pill"
            placeholder="Pincode"
            value={form.pincode}
            onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>

        {ADDRESSES.length > 0 && (
          <button
            className={`add-address__default-toggle${form.makeDefault ? ' add-address__default-toggle--on' : ''}`}
            onClick={() => update('makeDefault', !form.makeDefault)}
          >
            <span className="add-address__default-track">
              <span className="add-address__default-knob" />
            </span>
            Make this my default address
          </button>
        )}
      </main>

      <div className="add-address__footer">
        <button className="add-address__save" disabled={!isValid} onClick={handleSave}>
          Save Address
        </button>
      </div>
    </div>
  );
}
