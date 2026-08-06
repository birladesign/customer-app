import { getOrderIntents } from '../data/intents.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import {
  ChevronRightIcon,
  PackageIcon,
  EditIcon,
  CloseIcon,
  AlertTriangleIcon,
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
  reportIssue: AlertTriangleIcon,
  warranty: ShieldIcon,
  invoice: FileTextIcon,
  paymentDetails: WalletIcon,
  needHelp: HelpCircleIcon,
};

// PRD §9.1: "What can we help with?" — plain-language intents, never raw
// Cancel/Return tiles. Ineligible ones render greyed with the reason, never
// hidden (OT-08 / C2 discipline already established elsewhere in this app).
//
// Three-tier visual hierarchy (not just one flat list of navy text): a
// *navigable* row (leads somewhere real right now) reads bolder and darker
// than an *enabled-but-inert* row (present for completeness, no destination
// yet), which in turn reads clearly more present than a *disabled* row. Weight
// + color move together as a set, per Apple's typography hierarchy guidance —
// size alone doesn't carry it here since every row is the same font size.
export default function IntentList({ order, excludeKeys = [] }) {
  const { navigate } = useNavigation();
  const intents = getOrderIntents(order).filter((intent) => !excludeKeys.includes(intent.key));

  return (
    <div className="intent-list">
      <p className="intent-list__heading">What can we help with?</p>
      {intents.map((intent) => {
        const clickable = intent.enabled && intent.navigable;
        const Icon = INTENT_ICON[intent.key];
        const tier = !intent.enabled ? 'disabled' : intent.navigable ? 'primary' : 'inert';
        return (
          <button
            key={intent.key}
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
      })}
    </div>
  );
}
