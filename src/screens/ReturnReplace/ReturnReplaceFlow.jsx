import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS } from '../../data/orders.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../../motion.js';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import ReasonStep from './ReasonStep.jsx';
import EvidenceStep from './EvidenceStep.jsx';
import OptionsStep from './OptionsStep.jsx';
import ExecutionStep from './ExecutionStep.jsx';
import './ReturnReplaceFlow.css';

const STEP_TITLES = ["What's the issue?", 'Tell us more', 'Choose an option', 'Tracking it'];
const STEP_COUNT = STEP_TITLES.length;

export default function ReturnReplaceFlow({ params }) {
  const { goBack } = useNavigation();
  const reduceMotion = useReducedMotion();
  const order = ORDERS.find((o) => o.id === params.orderId);

  const [step, setStep] = useState(0);
  const [reason, setReason] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [selectedLever, setSelectedLever] = useState(null);
  const directionRef = useRef(1);

  function goToStep(next) {
    directionRef.current = next > step ? 1 : -1;
    setStep(next);
  }

  function handleBack() {
    if (step > 0) goToStep(step - 1);
    else goBack();
  }

  const direction = directionRef.current;

  if (!order) {
    return (
      <div className="return-replace">
        <header className="return-replace__topbar">
          <button className="return-replace__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Return or Replace</h1>
          <span className="return-replace__icon-btn-spacer" />
        </header>
        <p className="return-replace__not-found">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="return-replace">
      <header className="return-replace__topbar">
        <button className="return-replace__icon-btn" onClick={handleBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>{STEP_TITLES[step]}</h1>
        <span className="return-replace__icon-btn-spacer" />
      </header>

      <div className="return-replace__progress">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <span key={i} className={`return-replace__dot${i <= step ? ' return-replace__dot--done' : ''}`} />
        ))}
      </div>

      <div className="return-replace__stage">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={step}
            className="return-replace__step"
            initial={reduceMotion ? { opacity: 0 } : { x: direction > 0 ? '100%' : '-30%', opacity: direction > 0 ? 1 : 0.6 }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: direction > 0 ? '-30%' : '100%', opacity: direction > 0 ? 0.6 : 1 }}
            transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
          >
            {step === 0 && (
              <ReasonStep
                selected={reason}
                onSelect={setReason}
                onContinue={() => goToStep(1)}
              />
            )}
            {step === 1 && (
              <EvidenceStep
                order={order}
                reason={reason}
                photo={photo}
                onPhotoChange={setPhoto}
                onContinue={() => goToStep(2)}
              />
            )}
            {step === 2 && (
              <OptionsStep
                order={order}
                reason={reason}
                selectedLever={selectedLever}
                onSelectLever={setSelectedLever}
                onContinue={() => goToStep(3)}
              />
            )}
            {step === 3 && <ExecutionStep order={order} leverId={selectedLever} onDone={goBack} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
