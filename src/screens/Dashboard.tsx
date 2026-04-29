import React, { useState, useEffect, useRef } from 'react';
import { useApp, useWorkoutStats, useChallenge } from '../contexts/AppContext';
import { useCountUp } from '../hooks/useCountUp';
import { ACTIVITY_META } from '../types';
import './Dashboard.css';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

function getStatusMessage(weeklyCount: number, weeklyGoal: number): string {
  if (weeklyCount >= weeklyGoal) return "You've hit your weekly target. Rest or keep pushing.";
  if (weeklyCount === weeklyGoal - 1) return 'One more session to hit your weekly goal.';
  if (weeklyCount === 0) return 'First workout of the week. Make it count.';
  return `${weeklyGoal - weeklyCount} more sessions to hit your goal this week.`;
}

function relativeDate(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}



// Sparkline SVG component
function Sparkline({ data, color = 'var(--color-accent)' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));
  const path = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sparkline" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ring chart component
function RingChart({
  current,
  goal,
  color = 'var(--color-accent)',
  size = 120,
}: {
  current: number;
  goal: number;
  color?: string;
  size?: number;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / goal, 1);
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="ring-chart">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: 'stroke-dashoffset 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
    </svg>
  );
}

// Challenge Card component
function ChallengeCard() {
  const { challenge, progress, isCompleted, percentComplete, refreshChallenge } = useChallenge();
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedRef = useRef(isCompleted);

  // Detect when challenge transitions to completed
  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      
      prevCompletedRef.current = isCompleted;
      return () => clearTimeout(timer);
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  if (!challenge) return null;

  return (
    <div className={`challenge-card ${isCompleted ? 'challenge-card--completed' : ''} ${showCelebration ? 'challenge-card--celebrating' : ''}`}>
      {/* Celebration particles */}
      {showCelebration && (
        <div className="challenge-card__celebration">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="challenge-card__particle" style={{
              '--angle': `${i * 30}deg`,
              '--delay': `${i * 50}ms`,
            } as React.CSSProperties} />
          ))}
        </div>
      )}

      <div className="challenge-card__header">
        <span className="type-micro-label text-accent">THIS WEEK'S CHALLENGE</span>
        {!isCompleted && (
          <button className="btn btn-ghost btn-sm" onClick={refreshChallenge} title="Get a new challenge">
            ↻
          </button>
        )}
      </div>

      <div className="challenge-card__body">
        <span className="challenge-card__icon">{challenge.icon}</span>
        <div className="challenge-card__info">
          <h3 className="challenge-card__title type-card-title">
            {isCompleted ? '✓ ' : ''}{challenge.title}
          </h3>
          <p className="challenge-card__desc type-ai text-secondary">{challenge.description}</p>
        </div>
      </div>

      <div className="challenge-card__progress-bar">
        <div className="challenge-card__progress-track">
          <div
            className="challenge-card__progress-fill"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <span className="challenge-card__progress-label type-mono text-muted">
          {progress}/{challenge.target} {challenge.unit}
        </span>
      </div>

      {isCompleted && !showCelebration && (
        <span className="challenge-card__badge type-micro-label">🏆 COMPLETED</span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const stats = useWorkoutStats();
  const user = state.user!;

  const animMinutes = useCountUp(stats.weeklyMinutes, 600);
  const animCalories = useCountUp(stats.weeklyCalories, 600);
  const animStreak = useCountUp(stats.streak, 400);
  const animTotal = useCountUp(stats.totalWorkouts, 400);

  // Get last 7 days of minute data for sparkline
  const sparklineData: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayMinutes = state.workouts
      .filter((w) => new Date(w.loggedAt).toISOString().split('T')[0] === key)
      .reduce((sum, w) => sum + w.durationMinutes, 0);
    sparklineData.push(dayMinutes);
  }

  const navigateTo = (screen: string) => dispatch({ type: 'SET_SCREEN', payload: screen });

  return (
    <div className="dashboard">
      {/* HERO SECTION */}
      <section className="dashboard__hero page-section">
        <div className="ambient-glow" />
        <div className="dashboard__hero-watermark">{user.name}</div>
        <div className="dashboard__hero-content">
          <span className="type-micro-label text-muted">{getGreeting()}</span>
          <h1 className="type-page-title">{user.name}</h1>
          <p className="dashboard__status text-secondary">
            {getStatusMessage(stats.weeklyCount, stats.weeklyGoal)}
          </p>
          <div className="dashboard__pills">
            <span className="dashboard__pill">
              🔥 <span className="dashboard__pill-value">{animStreak}</span>-day streak
            </span>
            <span className="dashboard__pill">
              ⚡ <span className="dashboard__pill-value">{stats.weeklyCount}</span>/{stats.weeklyGoal} this week
            </span>
            <span className="dashboard__pill">
              ∿ <span className="dashboard__pill-value">{animCalories.toLocaleString()}</span> kcal
            </span>
          </div>
        </div>
      </section>

      {/* WEEKLY CHALLENGE */}
      <section className="page-section" style={{ animationDelay: '50ms' }}>
        <ChallengeCard />
      </section>

      {/* STATS GRID */}
      <section className="dashboard__stats card-grid page-section" style={{ animationDelay: '100ms' }}>
        {/* Hero StatCard: Weekly Active Minutes */}
        <div className="stat-card stat-card--hero">
          <div className="stat-card__header">
            <span className="type-micro-label text-muted">WEEKLY ACTIVE MINUTES</span>
          </div>
          <div className="stat-card__body">
            <div className="stat-card__value-group">
              <span className="stat-card__value type-hero-metric text-accent">{animMinutes}</span>
              <span className="stat-card__unit text-muted">min</span>
            </div>
            <Sparkline data={sparklineData} />
          </div>
          {stats.minutesDelta !== 0 && (
            <div className={`stat-card__delta ${stats.minutesDelta > 0 ? 'stat-card__delta--up' : 'stat-card__delta--down'}`}>
              {stats.minutesDelta > 0 ? '↑' : '↓'} {Math.abs(stats.minutesDelta)}% vs last week
            </div>
          )}
          <div className="stat-card__progress">
            <div
              className="stat-card__progress-fill"
              style={{ width: `${Math.min((stats.weeklyMinutes / 300) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Ring StatCard: Weekly Goal */}
        <div className="stat-card stat-card--ring">
          <div className="stat-card__ring-container">
            <RingChart current={stats.weeklyCount} goal={stats.weeklyGoal} />
            <div className="stat-card__ring-label">
              <span className="type-data text-primary">{stats.weeklyCount}</span>
              <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>/{stats.weeklyGoal}</span>
            </div>
          </div>
          <span className="type-micro-label text-muted">WEEKLY GOAL</span>
        </div>

        {/* Compact stats */}
        <div className="stat-card stat-card--compact">
          <span className="stat-card__compact-icon">💪</span>
          <div className="stat-card__compact-content">
            <span className="type-micro-label text-muted">TOTAL WORKOUTS</span>
            <span className="type-data text-primary">{animTotal}</span>
          </div>
        </div>

        <div className="stat-card stat-card--compact">
          <span className="stat-card__compact-icon">🔥</span>
          <div className="stat-card__compact-content">
            <span className="type-micro-label text-muted">CALORIES THIS WEEK</span>
            <span className="type-data text-primary">{animCalories.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card stat-card--compact">
          <span className="stat-card__compact-icon">⚡</span>
          <div className="stat-card__compact-content">
            <span className="type-micro-label text-muted">CURRENT STREAK</span>
            <span className="type-data text-accent">{animStreak} days</span>
          </div>
        </div>
      </section>

      {/* AI RECOMMENDATION */}
      <section className="dashboard__ai-card page-section" style={{ animationDelay: '200ms' }}>
        <div className="dashboard__ai-header">
          <span className="type-micro-label text-accent">AI COACH</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigateTo('coach')}>
            → View full plan
          </button>
        </div>
        <p className="dashboard__ai-body type-ai">
          {stats.recentWorkouts.length > 0
            ? `You've been consistent with ${ACTIVITY_META[stats.recentWorkouts[0].activityType]?.label.toLowerCase() || 'training'} this week. ${
                stats.weeklyCount >= stats.weeklyGoal
                  ? 'Consider active recovery — a mobility session would complement your recent intensity.'
                  : `Tonight try switching it up — your goal benefits from variety in training stimulus.`
              }`
            : 'Start logging your workouts and I\'ll provide personalised recommendations based on your training patterns.'}
        </p>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="dashboard__recent page-section" style={{ animationDelay: '300ms' }}>
        <div className="dashboard__recent-header">
          <span className="type-micro-label text-muted">RECENT</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigateTo('progress')}>
            View all →
          </button>
        </div>
        <div className="dashboard__recent-scroll">
          {stats.recentWorkouts.length === 0 ? (
            <div className="dashboard__empty-recent">
              <p className="text-muted">No workouts yet. Start logging!</p>
              <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('log')}>
                + Log Workout
              </button>
            </div>
          ) : (
            stats.recentWorkouts.map((workout) => (
              <div key={workout.id} className="activity-card">
                <span className="activity-card__icon">
                  {ACTIVITY_META[workout.activityType]?.icon || '💪'}
                </span>
                <span className="activity-card__name type-card-title" style={{ fontSize: 'var(--text-xl)' }}>
                  {ACTIVITY_META[workout.activityType]?.label || workout.activityType}
                </span>
                <span className="activity-card__duration type-timestamp">
                  {workout.durationMinutes} min
                </span>
                <span className="activity-card__date text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                  {relativeDate(workout.loggedAt)}
                </span>
                <span
                  className="activity-card__intensity-dot"
                  style={{
                    background:
                      workout.intensity === 1
                        ? 'var(--color-intensity-1)'
                        : workout.intensity === 2
                          ? 'var(--color-intensity-2)'
                          : 'var(--color-intensity-3)',
                  }}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
