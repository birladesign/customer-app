import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getOrderIntents } from '../data/intents.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PackageIcon,
  EditIcon,
  CloseIcon,
  ShieldIcon,
  FileTextIcon,
  WalletIcon,
  HelpCircleIcon,
} from './icons.jsx';
import './IntentList.css';

const INTENT_ICON = {
  returnReplace: PackageIcon,
  modify: EditIcon,
  cancel: CloseIcon,
  warranty: ShieldIcon,
  invoice: FileTextIcon,
  paymentDetails: WalletIcon,
  needHelp: HelpCircleIcon,
};

function IntentRow({ intent, order, navigate }) {
  const clickable = intent.enabled && intent.navigable;
  const Icon = INTENT_ICON[intent.key];
  const tier = !intent.enabled ? 'disabled' : intent.navigable ? 'primary' : 'inert';
  return (
    <button
      className={`intent-list__row intent-list__row--${tier}`}
      disabled={!intent.enabled}
      onClick={clickable ? () => navigate(intent.key, { orderId: order.id }) : undefined}
    >
      <span className="intent-list__icon">
        <Icon />
      </span>
      <span className="intent-list__text">
        <span className="intent-list__label">{intent.label}</span>
        {!intent.enabled && intent.reason && <span className="intent-list__reason">{intent.reason}</span>}
      </span>
      {clickable && <ChevronRightIcon className="intent-list__chevron" aria-hidden="true" />}
    </button>
  );
}

// PRD §9.1: "What can we help with?" — plain-language intents, never raw
// Cancel/Return tiles. Ineligible ones render greyed with the reason, never
// hidden (OT-08 / C2 discipline already established elsewhere in this app) —
// just tucked one tap deeper, not removed.
//
// Simplicity, not minimalism (Apple's design principles): show the common,
// actionable path immediately and put everything situational or ineligible
// behind "More options" rather than dumping a five-row wall on first glance.
// Three-tier visual hierarchy still applies within each group: a *navigable*
// row reads bolder/darker than an *enabled-but-inert* row, which reads more
// present than a *disabled* row.
export default function IntentList({ order, excludeKeys = [] }) {
  const { navigate } = useNavigation();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const intents = getOrderIntents(order).filter((intent) => !excludeKeys.includes(intent.key));

  const primary = intents.filter((intent) => intent.enabled && intent.navigable);
  const rest = intents.filter((intent) => !(intent.enabled && intent.navigable));

  return (
    <div className="intent-list">
      <p className="intent-list__heading">What can we help with?</p>
      {primary.map((intent) => (
        <IntentRow key={intent.key} intent={intent} order={order} navigate={navigate} />
      ))}

      {rest.length > 0 && (
        <>
          <button
            className="intent-list__more-toggle"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
          >
            <span>{moreOpen ? 'Fewer options' : 'More options'}</span>
            <ChevronDownIcon
              className={`intent-list__more-chevron${moreOpen ? ' intent-list__more-chevron--open' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {moreOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
                style={{ overflow: 'hidden' }}
              >
                {rest.map((intent) => (
                  <IntentRow key={intent.key} intent={intent} order={order} navigate={navigate} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
