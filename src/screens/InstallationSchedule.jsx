import { useEffect, useState } from 'react';
import { ORDERS, splitProductSpec } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import CalendarPicker, { formatSlotDate } from '../components/CalendarPicker.jsx';
import { ChevronLeftIcon, CalendarIcon, ClockIcon, UserIcon, CheckIcon, PhoneIcon } from '../components/icons.jsx';
import './InstallationSchedule.css';

// No real availability backend in this prototype — technician visits open
// from the first bookable day and stay open for a month, same bounded-window
// approach as DeliverySchedule.
const FIRST_BOOKABLE = new Date(2026, 7, 12);
const LAST_BOOKABLE = new Date(2026, 8, 12);

const TIME_WINDOWS = ['9 AM – 11 AM', '11 AM – 1 PM', '2 PM – 4 PM', '4 PM – 6 PM'];

const DEFAULT_TECHNICIAN = { name: 'Rajesh Kumar', phone: '+919876543210', phoneDisplay: '+91 98765 43210' };

export default function InstallationSchedule({ params }) {
  const { goBack, setHideTabBar } = useNavigation();
  // A booking sub-flow, not a tab destination — the tab bar competing with
  // the sticky Confirm button at the bottom reads as two different "you are
  // here" signals at once. Same pattern as Support's full-screen chat.
  useEffect(() => {
    setHideTabBar(true);
    return () => setHideTabBar(false);
  }, [setHideTabBar]);
  const order = ORDERS.find((o) => o.id === params.orderId);
  const wasConfirmed = order?.installationStatus === 'confirmed';
  // "Reschedule" (from the order card) jumps straight to the picker; "View
  // Slot" opens on the read-only current appointment first, matching each
  // button's own stated intent instead of always landing on the same screen.
  const [pickerOpen, setPickerOpen] = useState(!wasConfirmed || Boolean(params.reschedule));
  const [selectedDate, setSelectedDate] = useState(order?.installationSlot?.date ?? formatSlotDate(FIRST_BOOKABLE));
  const [selectedWindow, setSelectedWindow] = useState(order?.installationSlot?.window ?? TIME_WINDOWS[0]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The journey shouldn't just dump the customer back on My Orders the
  // instant they confirm — a booking earns its own acknowledgment, the same
  // way Return/Replace's ExecutionStep confirms before "Back to Order
  // Details." This renders in place of the picker; goBack() only fires once
  // they actually tap Done.
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  if (!order) {
    return (
      <div className="installation-schedule">
        <header className="installation-schedule__topbar">
          <button className="installation-schedule__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Installation Slot</h1>
          <span className="installation-schedule__icon-btn-spacer" />
        </header>
        <p className="installation-schedule__not-found">Order not found.</p>
      </div>
    );
  }

  const { name: productName, spec } = splitProductSpec(order.product);
  // Once a slot exists at all, any further pick is a reschedule of it —
  // otherwise this is the very first confirmation of the proposed default.
  const isReschedule = wasConfirmed;
  const isUnchanged =
    wasConfirmed && order.installationSlot?.date === selectedDate && order.installationSlot?.window === selectedWindow;

  function handleConfirm() {
    const slotText = `${selectedDate}, ${selectedWindow}`;
    const technician = order.technician ?? DEFAULT_TECHNICIAN;

    Object.assign(order, {
      installationStatus: 'confirmed',
      installationSlot: { date: selectedDate, window: selectedWindow },
      technician,
      status: { dot: 'blue', label: 'Installation Scheduled' },
      caption: `Technician visit: ${slotText}`,
      actions: [
        { label: 'View Slot', variant: 'secondary' },
        { label: 'Reschedule', variant: 'secondary' },
      ],
    });

    // Rescheduling revises the existing milestone rather than adding a new
    // one — otherwise the entry would land after the still-pending
    // "Installation Completed" placeholder and put the log out of order.
    const step = order.timeline?.steps[order.timeline.currentIndex];
    if (step) {
      step.label = 'Installation Scheduled';
      step.description = slotText;
      step.updates = [
        ...(step.updates ?? []),
        isReschedule
          ? { text: `Rescheduled — visit slot confirmed: ${slotText}` }
          : { text: `Technician ${technician.name} assigned` },
        { text: `Visit slot confirmed: ${slotText}` },
      ];
    }

    setConfirmOpen(false);
    setBookingConfirmed(true);
  }

  return (
    <div className="installation-schedule">
      <header className="installation-schedule__topbar">
        <button className="installation-schedule__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Installation Slot</h1>
        <span className="installation-schedule__icon-btn-spacer" />
      </header>

      <main className="installation-schedule__content">
        <div className="installation-schedule__product-card">
          <img className="installation-schedule__image" src={order.image} alt={order.product} />
          <div className="installation-schedule__product-text">
            <p className="installation-schedule__product">{productName}</p>
            {(order.qty || spec) && (
              <p className="installation-schedule__variant">
                {order.qty && <span>Qty: {order.qty}</span>}
                {order.qty && spec && <span className="installation-schedule__variant-dot" aria-hidden="true" />}
                {spec && <span>{spec}</span>}
              </p>
            )}
            <p className="installation-schedule__order-id">Order {order.id}</p>
          </div>
        </div>

        {bookingConfirmed ? (
          <>
            <div className="installation-schedule__success">
              <span className="installation-schedule__success-icon">
                <CheckIcon width="20" height="20" strokeWidth="3" />
              </span>
              <p className="installation-schedule__success-title">
                {isReschedule ? 'New Slot Confirmed' : 'Appointment Confirmed'}
              </p>
              <p className="installation-schedule__success-body">
                We'll see you on {selectedDate}, {selectedWindow}.
              </p>
            </div>

            <div className="installation-schedule__current">
              <div className="installation-schedule__current-row">
                <CalendarIcon width="16" height="16" />
                <span>{selectedDate}</span>
              </div>
              <div className="installation-schedule__current-row">
                <ClockIcon width="14" height="14" />
                <span>{selectedWindow}</span>
              </div>
              {order.technician && (
                <div className="installation-schedule__current-row">
                  <UserIcon width="16" height="16" />
                  <span>{order.technician.name}</span>
                </div>
              )}
            </div>

            {order.technician && (
              <p className="installation-schedule__technician-contact">
                <PhoneIcon width="14" height="14" />
                {order.technician.name} ·{' '}
                <a href={`tel:${order.technician.phone}`}>
                  {order.technician.phoneDisplay ?? order.technician.phone}
                </a>
              </p>
            )}

            <button
              className="installation-schedule__reschedule-link"
              onClick={() => {
                setBookingConfirmed(false);
                setPickerOpen(true);
              }}
            >
              Update Slot
            </button>
          </>
        ) : !pickerOpen ? (
          <>
            <div className="installation-schedule__current">
              <span className="installation-schedule__current-badge">Confirmed</span>
              <div className="installation-schedule__current-row">
                <CalendarIcon width="16" height="16" />
                <span>{order.installationSlot.date}</span>
              </div>
              <div className="installation-schedule__current-row">
                <ClockIcon width="14" height="14" />
                <span>{order.installationSlot.window}</span>
              </div>
              {order.technician && (
                <div className="installation-schedule__current-row">
                  <UserIcon width="16" height="16" />
                  <span>{order.technician.name}</span>
                </div>
              )}
            </div>
            <button className="installation-schedule__reschedule-link" onClick={() => setPickerOpen(true)}>
              Reschedule Appointment
            </button>
          </>
        ) : (
          <>
            {order.installationStatus === 'pending' && (
              <div className="installation-schedule__proposed-banner">
                <span className="installation-schedule__proposed-badge">Proposed for you</span>
                <p>
                  We've suggested a slot within 48 hours of delivery. Confirm it below, or choose another time.
                </p>
              </div>
            )}

            <section className="installation-schedule__section">
              <p className="installation-schedule__section-heading">Choose a Date</p>
              <CalendarPicker
                value={selectedDate}
                onChange={setSelectedDate}
                minDate={FIRST_BOOKABLE}
                maxDate={LAST_BOOKABLE}
              />
            </section>

            <section className="installation-schedule__section">
              <p className="installation-schedule__section-heading">Choose a Time</p>
              <div className="installation-schedule__window-row">
                {TIME_WINDOWS.map((w) => (
                  <button
                    key={w}
                    className={`installation-schedule__window-chip${
                      selectedWindow === w ? ' installation-schedule__window-chip--selected' : ''
                    }`}
                    onClick={() => setSelectedWindow(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {bookingConfirmed ? (
        <div className="installation-schedule__footer">
          <button className="installation-schedule__confirm" onClick={goBack}>
            Done
          </button>
        </div>
      ) : (
        pickerOpen && (
          <div className="installation-schedule__footer">
            <button className="installation-schedule__confirm" disabled={isUnchanged} onClick={() => setConfirmOpen(true)}>
              {isReschedule ? 'Confirm New Slot' : 'Confirm Appointment'}
            </button>
          </div>
        )
      )}

      <ConfirmSheet
        open={confirmOpen}
        title={isReschedule ? 'Confirm the new slot?' : 'Confirm this appointment?'}
        body={`Technician visit on ${selectedDate}, ${selectedWindow}.`}
        confirmLabel={isReschedule ? 'Confirm New Slot' : 'Confirm Appointment'}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
