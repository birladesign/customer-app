import { useState } from 'react';
import { ADDRESSES } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import ConfirmSheet from '../../components/ConfirmSheet.jsx';
import { ChevronLeftIcon, MapPinIcon, HouseIcon, CloseIcon } from '../../components/icons.jsx';
import './Addresses.css';

function AddressCard({ address, onDelete }) {
  return (
    <div className={`addresses__card${address.isDefault ? ' addresses__card--default' : ''}`}>
      <div className="addresses__card-header">
        <p className="addresses__card-name">{address.name}</p>
        <span className="addresses__badge">
          <HouseIcon width="12" height="12" />
          {address.label}
        </span>
        <button className="addresses__delete-btn" onClick={onDelete} aria-label="Remove address">
          <CloseIcon width="14" height="14" />
        </button>
      </div>
      <div className="addresses__card-lines">
        {address.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="addresses__card-phone">Mobile: {address.phone}</p>
    </div>
  );
}

export default function Addresses() {
  const { goBack } = useNavigation();
  const [addresses, setAddresses] = useState(ADDRESSES);
  const [pendingDelete, setPendingDelete] = useState(null);

  const defaultAddress = addresses.find((a) => a.isDefault);
  const otherAddresses = addresses.filter((a) => !a.isDefault);

  function confirmDelete() {
    setAddresses((prev) => prev.filter((a) => a.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  return (
    <div className="addresses">
      <header className="addresses__topbar">
        <button className="addresses__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>My Addresses</h1>
        <span className="addresses__icon-btn-spacer" />
      </header>

      <main className="addresses__content">
        <button className="addresses__add-btn">Add New Address</button>

        {addresses.length === 0 ? (
          <div className="addresses__empty">
            <span className="addresses__empty-icon">
              <MapPinIcon width="28" height="28" />
            </span>
            <p className="addresses__empty-title">No Address Found!</p>
            <p className="addresses__empty-body">Seems like you haven’t added an address yet!</p>
          </div>
        ) : (
          <>
            {defaultAddress && (
              <section className="addresses__section">
                <p className="addresses__section-heading">Default Address</p>
                <AddressCard address={defaultAddress} onDelete={() => setPendingDelete(defaultAddress)} />
              </section>
            )}
            {otherAddresses.length > 0 && (
              <section className="addresses__section">
                <p className="addresses__section-heading">Other Addresses</p>
                {otherAddresses.map((a) => (
                  <AddressCard key={a.id} address={a} onDelete={() => setPendingDelete(a)} />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <ConfirmSheet
        open={Boolean(pendingDelete)}
        title="Remove this address?"
        body={pendingDelete ? `${pendingDelete.name} — ${pendingDelete.lines[0]}` : ''}
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
