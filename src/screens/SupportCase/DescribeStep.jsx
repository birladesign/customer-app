import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { findOpenCaseForOrder } from '../../data/support.js';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import './DescribeStep.css';

const MIN_LENGTH = 10;

export default function DescribeStep({ order, lane, description, onDescriptionChange, photo, onPhotoChange, onContinue }) {
  const { navigate } = useNavigation();
  const existingCase = findOpenCaseForOrder(order?.id, lane);
  const canContinue = description.trim().length >= MIN_LENGTH;

  return (
    <div className="describe-step">
      {existingCase && (
        <div className="describe-step__dedup-warning">
          <span>
            You already have an open case ({existingCase.id}) for this. You can still file a new one, or{' '}
            <button className="describe-step__dedup-link" onClick={() => navigate('requests')}>
              view the existing case
            </button>
            .
          </span>
        </div>
      )}

      <label className="describe-step__label" htmlFor="case-description">
        Tell us what happened
      </label>
      <textarea
        id="case-description"
        className="describe-step__textarea"
        rows={5}
        placeholder={order ? `What went wrong with ${order.product}?` : 'What can we help with?'}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
      {!canContinue && <p className="describe-step__hint">A few more words would help ({description.trim().length}/{MIN_LENGTH}).</p>}

      <label className="describe-step__label">Add a photo (optional)</label>
      <PhotoUploadTile onChange={onPhotoChange} />

      <button className="describe-step__continue" disabled={!canContinue} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
