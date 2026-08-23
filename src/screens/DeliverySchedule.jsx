import { useEffect, useState } from 'react';
import { ORDERS, splitProductSpec } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import { ChevronLeftIcon, CalendarIcon, ClockIcon, CheckIcon } from '../components/icons.jsx';
import './DeliverySchedule.css';

const DATE_OPTIONS = [
  { value: '20 Aug 2026', day: 'Thu', label: '20 Aug' },
  { value: '21 Aug 2026', day: 'Fri', label: '21 Aug' },
  { value: '22 Aug 2026', day: 'Sat', label: '22 Aug' },
  { value: '23 Aug 2026', day: 'Sun', label: '23 Aug' },
  { value: '24 Aug 2026', day: 'Mon', label: '24 Aug' },
];

const TIME_WINDOWS = ['9 AM – 12 PM', '12 PM – 3 PM', '3 PM – 6 PM', '6 PM – 9 PM'];

export default function DeliverySchedule({ params }) {
  const { goBack, setHideTabBar } = useNavigation();

  useEffect(() => {
    setHideTabBar(true);
    return () => setHideTabBar(false);
  }, [setHideTabBar]);

  const order = ORDERS.find((o) => o.id === params.orderId);
  const wasConfirmed = order?.status?.label === 'Redelivery Scheduled';

  const [pickerOpen, setPickerOpen] = useState(!wasConfirmed || Boolean(params.reschedule));
  const [selectedDate, setSelectedDate] = useState(order?.deliverySlot?.date ?? DATE_OPTIONS[0].value);
  const [selectedWindow, setSelectedWindow] = useState(order?.deliverySlot?.window ?? TIME_WINDOWS[0]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  if (!order) {
    return (
      <div className="delivery-schedule">
        <header className="delivery-schedule__topbar">
          <button className="delivery-schedule__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Reschedule Delivery</h1>
          <span className="delivery-schedule__icon-btn-spacer" />
        </header>
        <p className="delivery-schedule__not-found">Order not found.</p>
      </div>
    );
  }

  const { name: productName } = splitProductSpec(order.product);
  const isReschedule = wasConfirmed;
  const isUnchanged =
    wasConfirmed && order.deliverySlot?.date === selectedDate && order.deliverySlot?.window === selectedWindow;

  function handleConfirm() {
    const slotText = `${selectedDate}, ${selectedWindow}`;

    Object.assign(order, {
      status: { dot: 'blue', label: 'Redelivery Scheduled' },
      caption: `Redelivery attempt: ${slotText}`,
      deliverySlot: { date: selectedDate, window: selectedWindow },
      actions: [{ label: 'Track Order', variant: 'secondary' }],
    });

    order.timeline?.steps.push({
      label: 'Redelivery Scheduled',
      timestamp: null,
      description: `Redelivery attempt scheduled for ${slotText}`,
      updates: [
        { text: `Redelivery request received from customer` },
        { text: `Redelivery confirmed for ${slotText}` },
      ],
    });
    if (order.timeline) order.timeline.currentIndex = order.timeline.steps.length - 1;

    setConfirmOpen(false);
    setBookingConfirmed(true);
  }

  return (
    <div className="delivery-schedule">
      <header className="delivery-schedule__topbar">
        <button className="delivery-schedule__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Reschedule Delivery</h1>
        <span className="delivery-schedule__icon-btn-spacer" />
      </header>

      <main className="delivery-schedule__content">
        <div className="delivery-schedule__product-card">
          <img className="delivery-schedule__image" src={order.image} alt={order.product} />
          <div className="delivery-schedule__product-text">
            <p className="delivery-schedule__product">{productName}</p>
            <p className="delivery-schedule__order-id">Order {order.id}</p>
          </div>
        </div>

        {bookingConfirmed ? (
          <>
            <div className="delivery-schedule__success">
              <span className="delivery-schedule__success-icon">
                <CheckIcon width="20" height="20" strokeWidth="3" />
              </span>
              <div>
                <p className="delivery-schedule__success-title">
                  {isReschedule ? 'New Slot Confirmed' : 'Redelivery Confirmed'}
                </p>
                <p className="delivery-schedule__success-body">
                  We'll attempt delivery on {selectedDate}, {selectedWindow}.
                </p>
              </div>
            </div>

            <div className="delivery-schedule__current">
              <div className="delivery-schedule__current-row">
                <CalendarIcon width="16" height="16" />
                <span>{selectedDate}</span>
              </div>
              <div className="delivery-schedule__current-row">
                <ClockIcon width="14" height="14" />
                <span>{selectedWindow}</span>
              </div>
            </div>

            <button
              className="delivery-schedule__reschedule-link"
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
            <div className="delivery-schedule__current">
              <span className="delivery-schedule__current-badge">Confirmed</span>
              <div className="delivery-schedule__current-row">
                <CalendarIcon width="16" height="16" />
                <span>{order.deliverySlot.date}</span>
              </div>
              <div className="delivery-schedule__current-row">
                <ClockIcon width="14" height="14" />
                <span>{order.deliverySlot.window}</span>
              </div>
            </div>
            <button className="delivery-schedule__reschedule-link" onClick={() => setPickerOpen(true)}>
              Reschedule Delivery
            </button>
          </>
        ) : (
          <>
            <section className="delivery-schedule__section">
              <p className="delivery-schedule__section-heading">Choose a Date</p>
              <div className="delivery-schedule__date-row">
                {DATE_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    className={`delivery-schedule__date-chip${
                      selectedDate === d.value ? ' delivery-schedule__date-chip--selected' : ''
                    }`}
                    onClick={() => setSelectedDate(d.value)}
                  >
                    <span className="delivery-schedule__date-day">{d.day}</span>
                    <span className="delivery-schedule__date-label">{d.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="delivery-schedule__section">
              <p className="delivery-schedule__section-heading">Choose a Time Window</p>
              <div className="delivery-schedule__window-row">
                {TIME_WINDOWS.map((w) => (
                  <button
                    key={w}
                    className={`delivery-schedule__window-chip${
                      selectedWindow === w ? ' delivery-schedule__window-chip--selected' : ''
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
        <div className="delivery-schedule__footer">
          <button className="delivery-schedule__confirm" onClick={goBack}>
            Done
          </button>
        </div>
      ) : (
        pickerOpen && (
          <div className="delivery-schedule__footer">
            <button className="delivery-schedule__confirm" disabled={isUnchanged} onClick={() => setConfirmOpen(true)}>
              {isReschedule ? 'Confirm New Slot' : 'Confirm Redelivery'}
            </button>
          </div>
        )
      )}

      <ConfirmSheet
        open={confirmOpen}
        title={isReschedule ? 'Confirm the new slot?' : 'Confirm redelivery?'}
        body={`Delivery attempt on ${selectedDate}, ${selectedWindow}.`}
        confirmLabel={isReschedule ? 'Confirm New Slot' : 'Confirm Redelivery'}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
