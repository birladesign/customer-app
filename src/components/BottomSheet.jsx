import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING_GESTURE } from '../motion.js';
import { CloseIcon } from './icons.jsx';
import './BottomSheet.css';

// Shared overlay/drag/spring shell for every bottom sheet in the app
// (ConfirmSheet, ...). A fast downward flick OR a long drag
// commits to close — velocity decides intent, not just distance.
export default function BottomSheet({ open, onClose, children }) {
  const reduceMotion = useReducedMotion();

  function handleDragEnd(_event, info) {
    const flungDown = info.velocity.y > 400;
    const draggedFar = info.offset.y > 120;
    if (flungDown || draggedFar) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="bottom-sheet-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.25 }}
        >
          <motion.div
            className="bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            drag={reduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduceMotion ? { duration: 0.2 } : SPRING_GESTURE}
          >
            <button className="bottom-sheet__close" onClick={onClose} aria-label="Close">
              <CloseIcon width="14" height="14" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
