import { useEffect, useRef, useState } from 'react';
import { DIAGNOSES, buildLadder, getTrialExpiredNotice, TRIAL_NIGHTS } from '../../data/retention.js';
import './RetentionLadder.css';

// Mattress discomfort, as a conversation rather than a menu.
//
// The old options screen put "Continue with posture correction", "Replace"
// and "Return" side by side as three equal buttons — so anyone who wanted a
// refund simply pressed the third one and the retention was decorative.
// A ladder only works if each rung is actually offered, and only works
// honestly if the exit stays visible while it is. Both are true here: every
// rung shows its own decline, and declining is one tap.
//
// The whole exchange stays on screen as a transcript. Someone who has just
// read why their mattress feels firm shouldn't lose that the moment they
// tap "I've already tried that".
export default function RetentionLadder({ order, onRetain, onEscalate }) {
  const [diagnosisKey, setDiagnosisKey] = useState(null);
  const [rungIndex, setRungIndex] = useState(0);
  const [thread, setThread] = useState([]);
  const endRef = useRef(null);

  const expired = getTrialExpiredNotice(order);
  const rungs = diagnosisKey ? buildLadder(order, diagnosisKey) : [];
  const rung = rungs[rungIndex] ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [thread, rung]);

  // Past the trial there is nothing honest left to offer for preference —
  // say so plainly instead of walking someone down a ladder that can't end
  // anywhere.
  if (expired) {
    return (
      <div className="ladder">
        <div className="ladder__notice">
          <p className="ladder__notice-title">{expired.title}</p>
          <p className="ladder__notice-body">{expired.body}</p>
        </div>
        <button className="ladder__primary" onClick={() => onEscalate('inspection')}>
          Something's wrong with it
        </button>
      </div>
    );
  }

  const append = (entry) => setThread((t) => [...t, { id: t.length, ...entry }]);

  function handleDiagnose(diagnosis) {
    append({ from: 'user', body: diagnosis.label });
    setDiagnosisKey(diagnosis.key);
    setRungIndex(0);
  }

  // Every advance banks the rung that was on screen into the transcript
  // before moving on, so the thread reads back as what was actually said.
  function bankCurrentRung() {
    if (rung) append({ from: 'bot', title: rung.title, body: rung.body });
  }

  function handleAccept() {
    bankCurrentRung();
    append({ from: 'user', body: rung.acceptLabel });
    if (rung.outcome === 'retained_replacement') return onEscalate('replace');
    if (rung.outcome === 'returned') return onEscalate('return');
    onRetain(rung);
  }

  function handleDecline() {
    bankCurrentRung();
    append({ from: 'user', body: rung.declineLabel });
    setRungIndex((i) => i + 1);
  }

  return (
    <div className="ladder">
      <div className="ladder__thread">
        <Bubble>
          Sorry it's not feeling right. "Uncomfortable" turns out to be several different problems with different
          fixes, so — what's actually bothering you?
        </Bubble>

        {!diagnosisKey && (
          <div className="ladder__choices">
            {DIAGNOSES.map((d) => (
              <button key={d.key} className="ladder__choice" onClick={() => handleDiagnose(d)}>
                {d.label}
              </button>
            ))}
          </div>
        )}

        {thread.map((entry) =>
          entry.from === 'user' ? (
            <div className="ladder__said" key={entry.id}>
              {entry.body}
            </div>
          ) : (
            <Bubble key={entry.id} title={entry.title}>
              {entry.body}
            </Bubble>
          )
        )}

        {rung && (
          <>
            <Bubble title={rung.title}>{rung.body}</Bubble>
            <div className="ladder__choices">
              <button className="ladder__choice ladder__choice--accept" onClick={handleAccept}>
                {rung.acceptLabel}
              </button>
              {/* The way out is on every rung, never buried a level down. */}
              {rung.declineLabel && (
                <button className="ladder__choice" onClick={handleDecline}>
                  {rung.declineLabel}
                </button>
              )}
            </div>
            {rung.kind !== 'exit' && (
              <p className="ladder__reassure">
                You have {TRIAL_NIGHTS} nights from delivery either way — nothing here gives that up.
              </p>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function Bubble({ title, children }) {
  return (
    <div className="ladder__bubble">
      {title && <p className="ladder__bubble-title">{title}</p>}
      <p className="ladder__bubble-body">{children}</p>
    </div>
  );
}
