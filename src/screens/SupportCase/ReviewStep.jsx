import { useEffect, useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CASE_LANES, findOpenCaseForOrder } from '../../data/support.js';
import './ReviewStep.css';

export default function ReviewStep({ lane, order, description, photo, escalate, onSubmit }) {
  const { navigate } = useNavigation();
  const [previewUrl, setPreviewUrl] = useState(null);
  const laneLabel = CASE_LANES.find((l) => l.key === lane)?.label ?? 'Something Else';
  const existingCase = findOpenCaseForOrder(order?.id, lane);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  return (
    <div className="review-step">
      {existingCase && (
        <div className="review-step__dedup-warning">
          <span>
            You already have an open case ({existingCase.id}) for this.{' '}
            <button className="review-step__dedup-link" onClick={() => navigate('requests')}>
              View it
            </button>{' '}
            or submit this one too.
          </span>
        </div>
      )}

      <div className="review-step__summary-card">
        {escalate && <span className="review-step__escalated-badge">Escalated to a specialist</span>}
        <div className="review-step__row">
          <span className="review-step__row-label">Category</span>
          <span className="review-step__row-value">{laneLabel}</span>
        </div>
        <div className="review-step__row">
          <span className="review-step__row-label">Order</span>
          <span className="review-step__row-value">{order ? `${order.product} (${order.id})` : 'Not linked to an order'}</span>
        </div>
        <div className="review-step__row review-step__row--stacked">
          <span className="review-step__row-label">Description</span>
          <p className="review-step__description">{description}</p>
        </div>
        {previewUrl && (
          <div className="review-step__row review-step__row--stacked">
            <span className="review-step__row-label">Photo</span>
            <img className="review-step__photo" src={previewUrl} alt="Attached evidence" />
          </div>
        )}
      </div>

      <button className="review-step__submit" onClick={onSubmit}>
        Submit Case
      </button>
    </div>
  );
}
