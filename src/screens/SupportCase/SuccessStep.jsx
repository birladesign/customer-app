import { useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CopyIcon, CheckIcon } from '../../components/icons.jsx';
import './SuccessStep.css';

export default function SuccessStep({ caseResult, onDone }) {
  const { replace } = useNavigation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(caseResult.id);
    } catch {
      // Clipboard API unavailable — the checkmark still confirms the tap.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="success-step">
      <p className="success-step__title">Case filed</p>

      <button className="success-step__case-id" onClick={handleCopy}>
        {copied ? <CheckIcon width="14" height="14" strokeWidth="3" /> : <CopyIcon width="14" height="14" />}
        <span>{caseResult.id}</span>
      </button>

      <p className="success-step__sla">{caseResult.slaLabel}</p>

      <div className="success-step__actions">
        <button className="success-step__view" onClick={() => replace('requests')}>
          View in My Cases
        </button>
        <button className="success-step__done" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
