import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { FitnessGoal, FitnessLevel, UserProfile } from '../types';
import { GOAL_META, LEVEL_META } from '../types';
import './Onboarding.css';

export default function Onboarding() {
  const { dispatch } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<FitnessLevel | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState(4);

  const handleContinueStep1 = () => {
    if (name.trim().length > 0 && parseInt(age) >= 13 && parseInt(age) <= 100) {
      setStep(2);
    }
  };

  const handleContinueStep2 = () => {
    if (goal) setStep(3);
  };

  const handleComplete = () => {
    if (!level) return;
    const profile: UserProfile = {
      name: name.trim(),
      age: parseInt(age),
      goal: goal!,
      level,
      daysPerWeek: daysPerWeek as UserProfile['daysPerWeek'],
      createdAt: new Date(),
    };
    dispatch({ type: 'SET_USER', payload: profile });
    dispatch({ type: 'COMPLETE_ONBOARDING' });
  };

  return (
    <div className="onboarding">
      {/* Left Panel — Visual */}
      <div className="onboarding__visual">
        <div className="onboarding__watermark">MOVE.</div>
        <div className="onboarding__brand">
          <span className="onboarding__logo">F</span>
          <span className="onboarding__brand-name">FORM</span>
        </div>
        <p className="onboarding__quote">
          Built for people who are serious about getting better.
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="onboarding__form">
        <div className="onboarding__step-indicator type-timestamp">
          {step} of 3
        </div>

        {/* Step 1: Name & Age */}
        {step === 1 && (
          <div className="onboarding__step page-section" key="step1">
            <h1 className="type-page-title onboarding__heading">
              What's your name?
            </h1>
            <div className="onboarding__fields">
              <input
                type="text"
                className="onboarding__input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <input
                type="number"
                className="onboarding__input"
                placeholder="Your age"
                min={13}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary btn-xl btn-full"
              onClick={handleContinueStep1}
              disabled={name.trim().length === 0 || !age || parseInt(age) < 13 || parseInt(age) > 100}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Goal Selection */}
        {step === 2 && (
          <div className="onboarding__step page-section" key="step2">
            <h1 className="type-page-title onboarding__heading">
              What brings you here?
            </h1>
            <div className="onboarding__goals card-grid">
              {(Object.entries(GOAL_META) as [FitnessGoal, typeof GOAL_META[FitnessGoal]][]).map(
                ([key, meta]) => (
                  <button
                    key={key}
                    className={`onboarding__goal-card ${goal === key ? 'onboarding__goal-card--selected' : ''}`}
                    onClick={() => setGoal(key)}
                  >
                    <span className="onboarding__goal-icon">{meta.icon}</span>
                    <span className="onboarding__goal-title">{meta.label}</span>
                    <span className="onboarding__goal-sub">{meta.subtitle}</span>
                    {goal === key && <span className="onboarding__check">✓</span>}
                  </button>
                )
              )}
            </div>
            <button
              className="btn btn-primary btn-xl btn-full"
              onClick={handleContinueStep2}
              disabled={!goal}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 3: Level & Days */}
        {step === 3 && (
          <div className="onboarding__step page-section" key="step3">
            <h1 className="type-page-title onboarding__heading">
              How active are you?
            </h1>
            <div className="onboarding__levels">
              {(Object.entries(LEVEL_META) as [FitnessLevel, typeof LEVEL_META[FitnessLevel]][]).map(
                ([key, meta]) => (
                  <button
                    key={key}
                    className={`onboarding__level-card ${level === key ? 'onboarding__level-card--selected' : ''}`}
                    onClick={() => setLevel(key)}
                  >
                    <span className="onboarding__level-title">{meta.label}</span>
                    <span className="onboarding__level-sub">{meta.subtitle}</span>
                    {level === key && <span className="onboarding__check">✓</span>}
                  </button>
                )
              )}
            </div>

            <div className="onboarding__days">
              <span className="type-micro-label text-secondary">DAYS PER WEEK</span>
              <div className="onboarding__day-dots">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    className={`onboarding__day-dot ${d <= daysPerWeek ? 'onboarding__day-dot--active' : ''}`}
                    onClick={() => setDaysPerWeek(d)}
                    aria-label={`${d} days per week`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary btn-xl btn-full"
              onClick={handleComplete}
              disabled={!level}
            >
              Start Training →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
