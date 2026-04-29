import { useState, useMemo } from 'react';
import { useApp, useChallenge } from '../contexts/AppContext';
import { ACTIVITY_META } from '../types';
import type { HeatmapData, WorkoutLog } from '../types';
import './Progress.css';

type DateRange = '7D' | '30D' | '90D' | 'ALL';

function getVerdict(trend: number): { text: string; color: string; sub: string } {
  if (trend > 10) return { text: "You're trending up.", color: 'var(--color-accent)', sub: 'Improving' };
  if (trend > -10) return { text: 'Staying consistent.', color: 'var(--color-text-primary)', sub: 'Consistent' };
  return { text: 'Time to refocus.', color: 'var(--color-text-secondary)', sub: 'Declining' };
}

// Activity Heatmap component
function ActivityHeatmap({ data }: { data: HeatmapData }) {
  const weeks = 26;
  const days = 7;
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const cells: Array<{ date: string; minutes: number; x: number; y: number }> = [];
  const now = new Date();

  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < days; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const key = date.toISOString().split('T')[0];
      const entry = data[key];
      cells.push({
        date: key,
        minutes: entry?.minutes || 0,
        x: (weeks - 1 - w) * 15,
        y: d * 15,
      });
    }
  }

  const getColor = (minutes: number): string => {
    if (minutes === 0) return 'var(--color-border)';
    if (minutes < 30) return 'rgba(212, 255, 0, 0.3)';
    if (minutes < 60) return 'rgba(212, 255, 0, 0.6)';
    if (minutes < 90) return 'rgba(212, 255, 0, 0.85)';
    return 'var(--color-accent)';
  };

  return (
    <div className="heatmap">
      <div className="heatmap__day-labels">
        {dayLabels.map((d, i) => (
          <span key={i} className="heatmap__label type-timestamp">{d}</span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${weeks * 15} ${days * 15}`}
        className="heatmap__svg"
        role="img"
        aria-label="Activity heatmap showing workout frequency over time"
      >
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width="12"
            height="12"
            rx="2"
            fill={getColor(cell.minutes)}
            className="heatmap__cell"
            aria-label={`${cell.date}: ${cell.minutes} minutes`}
          >
            <title>{`${cell.date}: ${cell.minutes} min`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

// Volume Bar Chart component
function VolumeChart({ weeklyData }: { weeklyData: Array<{ week: string; data: Record<string, number> }> }) {
  const maxMinutes = Math.max(
    ...weeklyData.map(w => Object.values(w.data).reduce((s, v) => s + v, 0)),
    1
  );
  const barColors: Record<string, string> = {
    RUN: '#D4FF00',
    LIFT: '#A78BFA',
    YOGA: '#34D399',
    CYCLE: '#60A5FA',
    HIIT: '#F472B6',
    SWIM: '#38BDF8',
    WALK: '#94A3B8',
    OTHER: '#94A3B8',
  };

  const chartHeight = 160;

  return (
    <div className="volume-chart">
      <svg viewBox={`0 0 ${weeklyData.length * 52} ${chartHeight + 30}`} className="volume-chart__svg">
        {/* Goal line */}
        <line
          x1="0"
          y1={chartHeight * 0.3}
          x2={weeklyData.length * 52}
          y2={chartHeight * 0.3}
          stroke="var(--color-text-muted)"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />
        {weeklyData.map((week, wi) => {
          const types = Object.keys(week.data);
          let yOffset = 0;


          return (
            <g key={wi}>
              {types.map((type, ti) => {
                const value = week.data[type];
                const barHeight = (value / maxMinutes) * chartHeight;
                const y = chartHeight - yOffset - barHeight;
                yOffset += barHeight;

                return (
                  <rect
                    key={ti}
                    x={wi * 52 + 8}
                    y={y}
                    width="36"
                    height={barHeight}
                    rx="3"
                    fill={barColors[type] || '#94A3B8'}
                    opacity="0.85"
                    style={{
                      transformOrigin: `${wi * 52 + 26}px ${chartHeight}px`,
                      animation: `form-bar-grow 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${wi * 40}ms both`,
                    }}
                  >
                    <title>{`${type}: ${value} min`}</title>
                  </rect>
                );
              })}
              <text
                x={wi * 52 + 26}
                y={chartHeight + 20}
                textAnchor="middle"
                fill="var(--color-text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {week.week}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Personal Records
function PersonalRecords({ workouts }: { workouts: WorkoutLog[] }) {
  const records = useMemo(() => {
    const ws = workouts;
    if (ws.length === 0) return [];

    const longestSession = ws.reduce((max, w) => w.durationMinutes > max.durationMinutes ? w : max, ws[0]);
    
    // Most sessions in a week
    const weekCounts: Record<string, number> = {};
    ws.forEach(w => {
      const d = new Date(w.loggedAt);
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weekCounts[key] = (weekCounts[key] || 0) + 1;
    });
    const maxWeekSessions = Math.max(...Object.values(weekCounts));

    // Streak
    const daySet = new Set<string>();
    ws.forEach(w => {
      const d = new Date(w.loggedAt);
      daySet.add(d.toISOString().split('T')[0]);
    });
    const sortedDays = Array.from(daySet).sort();
    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return [
      {
        medal: '🥇',
        title: 'Longest Session',
        date: new Date(longestSession.loggedAt).toLocaleDateString(),
        value: `${longestSession.durationMinutes} min`,
      },
      {
        medal: '🥈',
        title: 'Best Week',
        date: 'All time',
        value: `${maxWeekSessions} sessions`,
      },
      {
        medal: '🥉',
        title: 'Longest Streak',
        date: 'All time',
        value: `${maxStreak} days`,
      },
    ];
  }, [workouts]);

  return (
    <div className="records">
      {records.map((r, i) => (
        <div key={i} className="records__row">
          <span className="records__medal">{r.medal}</span>
          <div className="records__info">
            <span className="records__title">{r.title}</span>
            <span className="records__date type-timestamp text-muted">{r.date}</span>
          </div>
          <span className="records__value type-data text-accent">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Progress() {
  const { state } = useApp();
  const { challenge, history: challengeHistory, percentComplete } = useChallenge();
  const [range, setRange] = useState<DateRange>('30D');
  const workouts = state.workouts;

  // Filter by date range
  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    switch (range) {
      case '7D': cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30D': cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90D': cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: cutoff = new Date(0);
    }
    return workouts.filter(w => new Date(w.loggedAt) >= cutoff);
  }, [workouts, range]);

  // Build heatmap data
  const heatmapData: HeatmapData = useMemo(() => {
    const data: HeatmapData = {};
    workouts.forEach(w => {
      const key = new Date(w.loggedAt).toISOString().split('T')[0];
      if (!data[key]) data[key] = { count: 0, minutes: 0 };
      data[key].count++;
      data[key].minutes += w.durationMinutes;
    });
    return data;
  }, [workouts]);

  // Build weekly volume data
  const weeklyVolumeData = useMemo(() => {
    const weeks: Array<{ week: string; data: Record<string, number> }> = [];
    const now = new Date();
    const numWeeks = range === '7D' ? 1 : range === '30D' ? 4 : range === '90D' ? 12 : 26;

    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekWorkouts = workouts.filter(
        w => new Date(w.loggedAt) >= weekStart && new Date(w.loggedAt) < weekEnd
      );

      const data: Record<string, number> = {};
      weekWorkouts.forEach(w => {
        data[w.activityType] = (data[w.activityType] || 0) + w.durationMinutes;
      });

      weeks.push({
        week: `W${numWeeks - i}`,
        data,
      });
    }
    return weeks;
  }, [workouts, range]);

  // Calculate trend
  const trend = useMemo(() => {
    if (filteredWorkouts.length < 2) return 0;
    const midpoint = Math.floor(filteredWorkouts.length / 2);
    const recent = filteredWorkouts.slice(0, midpoint);
    const older = filteredWorkouts.slice(midpoint);
    const recentAvg = recent.reduce((s, w) => s + w.durationMinutes, 0) / recent.length;
    const olderAvg = older.reduce((s, w) => s + w.durationMinutes, 0) / older.length;
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  }, [filteredWorkouts]);

  const verdict = getVerdict(trend);

  // Streak milestone check
  const streak = useMemo(() => {
    const daySet = new Set<string>();
    workouts.forEach(w => {
      const d = new Date(w.loggedAt);
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    let s = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    while (daySet.has(`${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`)) {
      s++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return s;
  }, [workouts]);

  const isMilestone = [7, 14, 30, 60, 100].includes(streak);

  return (
    <div className="progress">
      {/* Header */}
      <div className="progress__header page-section">
        <h1 className="type-page-title">PROGRESS</h1>
        <div className="progress__range-toggle">
          {(['7D', '30D', '90D', 'ALL'] as DateRange[]).map(r => (
            <button
              key={r}
              className={`progress__range-btn ${range === r ? 'progress__range-btn--active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Milestone Banner */}
      {isMilestone && (
        <div className="progress__milestone page-section">
          <span className="progress__milestone-text">🔥 {streak}-DAY STREAK</span>
        </div>
      )}

      {/* Verdict Card */}
      <section className="progress__verdict page-section" style={{ animationDelay: '60ms' }}>
        {workouts.length === 0 ? (
          <>
            <h2 className="type-page-title text-muted">Start logging to see your progress.</h2>
          </>
        ) : (
          <>
            <h2 className="type-page-title" style={{ color: verdict.color }}>{verdict.text}</h2>
            <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
              Based on your last {filteredWorkouts.length} workouts
            </p>
          </>
        )}
      </section>

      {/* Heatmap */}
      <section className="progress__section page-section" style={{ animationDelay: '120ms' }}>
        <span className="type-micro-label text-muted">ACTIVITY</span>
        <ActivityHeatmap data={heatmapData} />
        <span className="type-timestamp text-muted" style={{ marginTop: 'var(--space-2)' }}>
          {filteredWorkouts.length} sessions this period
        </span>
      </section>

      {/* Volume Chart */}
      {weeklyVolumeData.some(w => Object.keys(w.data).length > 0) && (
        <section className="progress__section page-section" style={{ animationDelay: '180ms' }}>
          <span className="type-micro-label text-muted">VOLUME BY WEEK</span>
          <VolumeChart weeklyData={weeklyVolumeData} />
          <div className="volume-chart__legend">
            {Object.entries(ACTIVITY_META).slice(0, 5).map(([key, meta]) => (
              <span key={key} className="volume-chart__legend-item">
                <span
                  className="volume-chart__legend-dot"
                  style={{
                    background: key === 'RUN' ? '#D4FF00' : key === 'LIFT' ? '#A78BFA' : key === 'YOGA' ? '#34D399' : key === 'CYCLE' ? '#60A5FA' : '#F472B6',
                  }}
                />
                {meta.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Personal Records */}
      {workouts.length > 0 && (
        <section className="progress__section page-section" style={{ animationDelay: '240ms' }}>
          <div className="progress__section-header">
            <span className="type-micro-label text-muted">RECORDS</span>
            <span className="type-timestamp text-muted">All time</span>
          </div>
          <PersonalRecords workouts={workouts} />
        </section>
      )}

      {/* Weekly Challenges */}
      {(challenge || challengeHistory.length > 0) && (
        <section className="progress__section page-section" style={{ animationDelay: '300ms' }}>
          <div className="progress__section-header">
            <span className="type-micro-label text-muted">CHALLENGES</span>
            <span className="type-timestamp text-muted">
              {challengeHistory.filter(c => c.status === 'completed').length} completed
            </span>
          </div>

          {/* Active challenge */}
          {challenge && challenge.status === 'active' && (
            <div className="challenge-history__active">
              <div className="challenge-history__row challenge-history__row--active">
                <span className="challenge-history__icon">{challenge.icon}</span>
                <div className="challenge-history__info">
                  <span className="challenge-history__title">{challenge.title}</span>
                  <span className="challenge-history__meta type-timestamp text-muted">This week · In progress</span>
                </div>
                <div className="challenge-history__progress-ring">
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke="var(--color-accent)" strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 15}`}
                      strokeDashoffset={`${2 * Math.PI * 15 * (1 - percentComplete / 100)}`}
                      transform="rotate(-90 18 18)"
                      style={{ transition: 'stroke-dashoffset 600ms ease' }}
                    />
                  </svg>
                  <span className="challenge-history__progress-text type-timestamp">
                    {Math.round(percentComplete)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Completed challenge (current week) */}
          {challenge && challenge.status === 'completed' && (
            <div className="challenge-history__row challenge-history__row--completed">
              <span className="challenge-history__icon">🏆</span>
              <div className="challenge-history__info">
                <span className="challenge-history__title">{challenge.title}</span>
                <span className="challenge-history__meta type-timestamp text-accent">This week · Completed!</span>
              </div>
              <span className="challenge-history__badge">✓</span>
            </div>
          )}

          {/* Past challenges */}
          {challengeHistory.length > 0 && (
            <div className="challenge-history__list">
              {challengeHistory.slice(0, 8).map((c) => (
                <div
                  key={c.id}
                  className={`challenge-history__row ${c.status === 'completed' ? 'challenge-history__row--completed' : 'challenge-history__row--failed'}`}
                >
                  <span className="challenge-history__icon">
                    {c.status === 'completed' ? '🏆' : c.icon}
                  </span>
                  <div className="challenge-history__info">
                    <span className="challenge-history__title">{c.title}</span>
                    <span className="challenge-history__meta type-timestamp text-muted">
                      Week of {c.weekStart} · {c.current}/{c.target} {c.unit}
                    </span>
                  </div>
                  {c.status === 'completed' ? (
                    <span className="challenge-history__badge">✓</span>
                  ) : (
                    <span className="challenge-history__badge challenge-history__badge--missed">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
