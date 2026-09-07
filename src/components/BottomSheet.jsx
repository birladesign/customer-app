import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, useReducedMotion } from 'motion/react';
import { SPRING_GESTURE, shouldDismissSheet } from '../motion.js';
import { CloseIcon } from './icons.jsx';
import './BottomSheet.css';

// Shared overlay/drag/spring shell for every bottom sheet in the app
// (ConfirmSheet, Tracking Updates, the Return/Replace verdict + options
// sheets, ...). Drag-to-dismiss is velocity-aware end to end, per Apple's
// "Designing Fluid Interfaces": where the flick is *going* decides intent
// (shouldDismissSheet, in motion.js), and the finger's speed carries into the
// animation that follows it.

// The drag distance over which the scrim fades to its floor. The scrim never
// goes fully clear — the sheet is still modal until it's actually gone.
const SCRIM_FADE_DISTANCE = 320;
const SCRIM_MIN_OPACITY = 0.35;

export default function BottomSheet({ open, onClose, children }) {
  const reduceMotion = useReducedMotion();
  const sheetRef = useRef(null);
  // Velocity of the flick that dismissed the sheet, handed to the exit spring
  // so there's no seam between the finger and the animation. Zero for every
  // non-gesture close (the scrim, the close button, a parent's state change),
  // which should settle at the spring's own pace rather than fake momentum.
  const [exitVelocity, setExitVelocity] = useState(0);
  // Live drag offset. A motion value rather than state: the scrim reads it
  // every frame without re-rendering the sheet or its contents.
  const dragY = useMotionValue(0);
  const scrimOpacity = useTransform(dragY, [0, SCRIM_FADE_DISTANCE], [1, SCRIM_MIN_OPACITY], { clamp: true });

  // A reopened sheet starts from rest — otherwise the next close would
  // inherit the last flick's velocity and fly out on its own.
  useEffect(() => {
    if (open) {
      setExitVelocity(0);
      dragY.set(0);
    }
  }, [open, dragY]);

  function handleDrag(_event, info) {
    dragY.set(Math.max(0, info.offset.y));
  }

  function handleDragEnd(_event, info) {
    const height = sheetRef.current?.offsetHeight ?? 0;
    if (shouldDismissSheet({ offset: info.offset.y, velocity: info.velocity.y, height })) {
      setExitVelocity(info.velocity.y);
      onClose();
      return;
    }
    // Settling back — Motion springs to the constraint on its own; the scrim
    // just has to come back with it.
    dragY.set(0);
  }

  function handleCloseWithoutGesture() {
    setExitVelocity(0);
    onClose();
  }

  // Exit is a variant function so it can read the flick's velocity at the
  // moment the sheet leaves (§ velocity handoff). Reduced motion never gets
  // the spring at all — a short fade stands in for the whole gesture.
  const sheetVariants = {
    hidden: { y: '100%' },
    visible: { y: 0 },
    exit: (velocity) =>
      reduceMotion
        ? { y: 0, opacity: 0, transition: { duration: 0.15 } }
        : { y: '100%', transition: { ...SPRING_GESTURE, velocity } },
  };

  return (
    <AnimatePresence custom={exitVelocity}>
      {open && (
        <motion.div
          className="bottom-sheet-overlay"
          onClick={handleCloseWithoutGesture}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.25 }}
        >
          <motion.div
            className="bottom-sheet-overlay__scrim"
            style={{ opacity: reduceMotion ? 1 : scrimOpacity }}
            aria-hidden="true"
          />
          <motion.div
            ref={sheetRef}
            className="bottom-sheet"
            custom={exitVelocity}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            drag={reduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            // Resists upward (there's nothing above it) and gives downward,
            // so the edge reads as a soft boundary rather than a frozen one.
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            transition={reduceMotion ? { duration: 0.2 } : SPRING_GESTURE}
          >
            <button className="bottom-sheet__close" onClick={handleCloseWithoutGesture} aria-label="Close">
              <CloseIcon width="14" height="14" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
