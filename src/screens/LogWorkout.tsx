import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import type { ActivityType, Intensity, WorkoutLog } from '../types';
import { ACTIVITY_META } from '../types';
import './LogWorkout.css';

const ACTIVITY_TYPES: ActivityType[] = ['RUN', 'CYCLE', 'LIFT', 'YOGA', 'SWIM', 'HIIT', 'WALK', 'OTHER'];

const AI_TIPS = [
  "Great effort. Take a stretch — tight hamstrings recover faster with 5 minutes of static hold.",
  "Solid session. Stay hydrated — your body needs about 500ml extra for every 30 minutes of exercise.",
  "Well done. Consider a protein-rich meal within the next hour to maximise recovery.",
  "Nice work. Sleep is your secret weapon — aim for 7–9 hours tonight for optimal adaptation.",
  "Strong session. Tomorrow, try a different modality to keep your body adapting.",
  "Good training. A 10-minute cool-down walk can reduce post-workout soreness significantly.",
];

export default function LogWorkout() {
  const { state, dispatch } = useApp();
  const [activity, setActivity] = useState<ActivityType | null>(null);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>(2);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [aiTip, setAiTip] = useState('');

  // Auto-advance to step 2 when activity is selected
  useEffect(() => {
    if (activity && step === 1) {
      const timer = setTimeout(() => setStep(2), 250);
      return () => clearTimeout(timer);
    }
  }, [activity, step]);

  const handleSave = () => {
    if (!activity || !state.user) return;
    const caloriesPerMinute = intensity === 1 ? 5 : intensity === 2 ? 8 : 12;
    const workout: WorkoutLog = {
      id: `workout-${Date.now()}`,
      userId: state.user.name,
      activityType: activity,
      durationMinutes: duration,
      intensity,
      notes: notes.trim() || undefined,
      loggedAt: new Date(),
      caloriesBurned: duration * caloriesPerMinute,
    };
    dispatch({ type: 'ADD_WORKOUT', payload: workout });
    setSaved(true);
    
    // Show AI tip after 800ms
    setTimeout(() => {
      setAiTip(AI_TIPS[Math.floor(Math.random() * AI_TIPS.length)]);
    }, 800);
  };

  const handleReset = () => {
    setActivity(null);
    setDuration(30);
    setIntensity(2);
    setNotes('');
    setStep(1);
    setSaved(false);
    setAiTip('');
  };

  // Saved confirmation view
  if (saved) {
    return (
      <div className="log-workout log-workout--saved page-section">
        <div className="log-workout__confirm">
          <svg className="log-workout__checkmark" viewBox="0 0 52 52" width="80" height="80">
            <circle cx="26" cy="26" r="24" fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity="0.2" />
            <path
              className="log-workout__checkmark-path"
              d="M14 27l8 8 16-16"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="type-hero-metric text-primary" style={{ marginTop: 'var(--space-6)' }}>
            Logged.
          </h1>
          <p className="text-secondary" style={{ marginTop: 'var(--space-3)' }}>
            {ACTIVITY_META[activity!]?.label} · {duration} min · {intensity === 1 ? 'Easy' : intensity === 2 ? 'Moderate' : 'Hard'}
          </p>
          {aiTip && (
            <p className="log-workout__ai-tip type-ai text-accent" style={{ marginTop: 'var(--space-6)' }}>
              {aiTip}
            </p>
          )}
          <div className="log-workout__confirm-actions" style={{ marginTop: 'var(--space-8)' }}>
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'dashboard' })}>
              Back to Dashboard
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              + Log another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="log-workout">
      <h1 className="type-page-title page-section">LOG</h1>

      {/* Step 1: Activity Selection */}
      <section className="log-workout__section page-section" style={{ animationDelay: '60ms' }}>
        <div className="activity-grid card-grid">
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type}
              className={`activity-cell ${activity === type ? 'activity-cell--selected' : ''}`}
              onClick={() => setActivity(type)}
              aria-label={`Select ${ACTIVITY_META[type].label}`}
            >
              <span className="activity-cell__icon">{ACTIVITY_META[type].icon}</span>
              <span className="activity-cell__label">{ACTIVITY_META[type].label}</span>
              {activity === type && <span className="activity-cell__check">✓</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: Duration + Intensity */}
      {step >= 2 && (
        <section className="log-workout__section page-section" style={{ animationDelay: '0ms' }}>
          {/* Duration Stepper */}
          <div className="duration-stepper">
            <button
              className="duration-stepper__btn"
              onClick={() => setDuration(Math.max(5, duration - 5))}
              aria-label="Decrease duration"
            >
              −
            </button>
            <div className="duration-stepper__display">
              <span className="duration-stepper__value type-page-title">{duration}</span>
              <span className="duration-stepper__unit text-muted">minutes</span>
            </div>
            <button
              className="duration-stepper__btn"
              onClick={() => setDuration(Math.min(300, duration + 5))}
              aria-label="Increase duration"
            >
              +
            </button>
          </div>

          {/* Intensity Selector */}
          <div className="intensity-selector">
            {([1, 2, 3] as Intensity[]).map((level) => (
              <button
                key={level}
                className={`intensity-pill ${intensity === level ? `intensity-pill--${level}` : ''}`}
                onClick={() => setIntensity(level)}
              >
                {level === 1 ? 'Easy' : level === 2 ? 'Moderate' : 'Hard'}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="log-workout__notes">
            <textarea
              className="log-workout__textarea"
              placeholder="How did it feel?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </section>
      )}

      {/* Save Button */}
      <div className="log-workout__save">
        <button
          className="btn btn-primary btn-xl btn-full"
          onClick={handleSave}
          disabled={!activity}
        >
          SAVE WORKOUT
        </button>
      </div>
    </div>
  );
}
