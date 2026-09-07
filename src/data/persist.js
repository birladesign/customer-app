// Session persistence for the prototype.
//
// Every flow in this app mutates the shared ORDERS / USER_CASES / ADDRESSES
// module arrays in place — there's no backend, which is deliberate. The
// consequence was that a reload silently threw away everything the customer
// had just done: a cancelled order came back live, a filed case vanished from
// My Cases. That's fine while someone is being walked through the demo and
// fatal the moment a stakeholder opens the deployed link and clicks around on
// their own.
//
// This snapshots the mutable state to localStorage and rehydrates it on boot.
// It is not a data layer: the fixtures remain the source of truth for shape,
// and a version bump throws the snapshot away rather than trying to migrate.

const KEY = 'tsc-postpurchase-state';
// Bump whenever the fixture shape changes, so an old snapshot can't resurrect
// orders that no longer match what the screens expect.
const VERSION = 3;

// localStorage throws outright in some privacy modes rather than returning
// null, so every access is guarded and a failure just means "no snapshot".
function safeRead() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeWrite(value) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage blocked — the session still works, it just
    // won't survive a reload. Not worth interrupting the customer over.
  }
}

// Replaces the contents of a module-level array without rebinding it, since
// every screen imported the original reference at module load.
function replaceContents(target, next) {
  if (!Array.isArray(next)) return;
  target.length = 0;
  target.push(...next);
}

export function hydrate({ orders, cases, addresses }) {
  const snapshot = safeRead();
  if (!snapshot || snapshot.version !== VERSION) return false;
  replaceContents(orders, snapshot.orders);
  replaceContents(cases, snapshot.cases);
  replaceContents(addresses, snapshot.addresses);
  return true;
}

export function snapshot({ orders, cases, addresses }) {
  safeWrite({ version: VERSION, orders, cases, addresses });
}

export function clearSnapshot() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // See safeWrite — nothing useful to do if storage is unavailable.
  }
}
