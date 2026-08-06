import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING_GESTURE } from '../motion.js';
import { CloseIcon } from './icons.jsx';
import './FilterSheet.css';

const STATUS_CHIPS = ['All', 'Action', 'Active', 'Done', 'Closed', 'Returns'];

export default function FilterSheet({ open, selected, onSelect, onClear, onApply, onClose }) {
  const reduceMotion = useReducedMotion();

  function handleDragEnd(_event, info) {
    // Commit to close on a fast downward flick OR a long drag — velocity decides
    // intent, not just distance. Otherwise the sheet's own drag spring carries
    // whatever velocity remains back to rest; no manual snap-back needed.
    const flungDown = info.velocity.y > 400;
    const draggedFar = info.offset.y > 120;
    if (flungDown || draggedFar) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="filter-sheet-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.25 }}
        >
          <motion.div
            className="filter-sheet"
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
            <div className="filter-sheet__grabber" aria-hidden="true" />

            <div className="filter-sheet__header">
              <h2>Filter Orders</h2>
              <button className="filter-sheet__close" onClick={onClose} aria-label="Close">
                <CloseIcon />
              </button>
            </div>

            <p className="filter-sheet__section-label">STATUS</p>
            <div className="filter-sheet__chips">
              {STATUS_CHIPS.map((chip) => (
                <button
                  key={chip}
                  className={`filter-sheet__chip${selected === chip ? ' filter-sheet__chip--selected' : ''}`}
                  onClick={() => onSelect(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="filter-sheet__footer">
              <button className="filter-sheet__clear" onClick={onClear}>
                Clear All
              </button>
              <button className="filter-sheet__apply" onClick={onApply}>
                Apply Filters
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
