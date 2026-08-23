import { useState } from 'react';
import { ADDRESSES, CURRENT_USER, addAddress } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import './AddAddress.css';

const LABELS = ['Home', 'Office', 'Other'];

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/;

const EMPTY_FORM = {
  label: 'Home',
  name: `${CURRENT_USER.firstName} ${CURRENT_USER.lastName}`,
  phone: CURRENT_USER.phone,
  line1: '',
  city: '',
  state: '',
  pincode: '',
  makeDefault: ADDRESSES.length === 0,
  billingSameAsShipping: true,
  billingLine1: '',
  billingCity: '',
  billingState: '',
  billingPincode: '',
  gstin: '',
  businessName: '',
};

export default function AddAddress({ params }) {
  const { goBack } = useNavigation();
  const [form, setForm] = useState(EMPTY_FORM);
  // Billing/GST only matter when this screen is reached while editing an
  // order — the general Profile > Addresses flow has no invoice to bill, so
  // it stays exactly as short as it was.
  const forOrder = Boolean(params?.forOrder);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const isShippingValid =
    form.name.trim().length > 0 &&
    /^[6-9]\d{9}$/.test(form.phone.trim()) &&
    form.line1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length > 0 &&
    /^\d{6}$/.test(form.pincode.trim());

  const isBillingValid =
    !forOrder ||
    form.billingSameAsShipping ||
    (form.billingLine1.trim().length > 0 &&
      form.billingCity.trim().length > 0 &&
      form.billingState.trim().length > 0 &&
      /^\d{6}$/.test(form.billingPincode.trim()));

  // GST details are optional — but a partially-typed GSTIN shouldn't quietly
  // save as if it were complete, so it only counts as valid once it's either
  // empty or a properly formed 15-character GSTIN with a business name.
  const isGstValid =
    !forOrder || form.gstin.trim().length === 0 || (GSTIN_PATTERN.test(form.gstin.trim()) && form.businessName.trim().length > 0);

  const isValid = isShippingValid && isBillingValid && isGstValid;

  function handleSave() {
    addAddress({
      label: form.label,
      isDefault: form.makeDefault,
      name: form.name.trim(),
      lines: [form.line1.trim(), `${form.city.trim()}, ${form.state.trim()}`, form.pincode.trim(), 'India'],
      phone: form.phone.trim(),
      ...(forOrder && {
        billingLines: form.billingSameAsShipping
          ? [form.line1.trim(), `${form.city.trim()}, ${form.state.trim()}`, form.pincode.trim(), 'India']
          : [form.billingLine1.trim(), `${form.billingCity.trim()}, ${form.billingState.trim()}`, form.billingPincode.trim(), 'India'],
        gstin: form.gstin.trim() || null,
        businessName: form.gstin.trim() ? form.businessName.trim() : null,
      }),
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
        {forOrder && <p className="add-address__section-heading">Shipping Address</p>}

        <div className="add-address__label-row">
          {LABELS.map((label) => (
            <button
              key={label}
              className={`add-address__label-chip${form.label === label ? ' add-address__label-chip--selected' : ''}`}
              onClick={() => update('label', label)}
            >
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

        {forOrder && (
          <>
            <p className="add-address__section-heading">Billing Address</p>

            <label className="add-address__checkbox">
              <input
                type="checkbox"
                checked={form.billingSameAsShipping}
                onChange={(e) => update('billingSameAsShipping', e.target.checked)}
              />
              Same as shipping address
            </label>

            {!form.billingSameAsShipping && (
              <div className="add-address__fields">
                <input
                  className="add-address__pill"
                  placeholder="House no., street, area"
                  value={form.billingLine1}
                  onChange={(e) => update('billingLine1', e.target.value)}
                />
                <input
                  className="add-address__pill"
                  placeholder="City"
                  value={form.billingCity}
                  onChange={(e) => update('billingCity', e.target.value)}
                />
                <input
                  className="add-address__pill"
                  placeholder="State"
                  value={form.billingState}
                  onChange={(e) => update('billingState', e.target.value)}
                />
                <input
                  className="add-address__pill"
                  placeholder="Pincode"
                  value={form.billingPincode}
                  onChange={(e) => update('billingPincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
            )}

            <p className="add-address__section-heading">GST Details (Optional)</p>

            <div className="add-address__fields">
              <input
                className="add-address__pill"
                placeholder="Business Name"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
              />
              <input
                className="add-address__pill"
                placeholder="GSTIN"
                value={form.gstin}
                onChange={(e) => update('gstin', e.target.value.toUpperCase().slice(0, 15))}
              />
            </div>
          </>
        )}

        {ADDRESSES.length > 0 && (
          <label className="add-address__checkbox">
            <input
              type="checkbox"
              checked={form.makeDefault}
              onChange={(e) => update('makeDefault', e.target.checked)}
            />
            Make this my default address
          </label>
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
