import BottomSheet from './BottomSheet.jsx';
import './ConfirmSheet.css';

// Generic bottom-sheet confirm dialog — composes the shared BottomSheet shell
// rather than duplicating the drag/spring/overlay mechanics.
export default function ConfirmSheet({ open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onClose }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="confirm-sheet__title">{title}</h2>
      <p className="confirm-sheet__body">{body}</p>
      <div className="confirm-sheet__footer">
        <button className="confirm-sheet__cancel" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          className={`confirm-sheet__confirm${danger ? ' confirm-sheet__confirm--danger' : ''}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
