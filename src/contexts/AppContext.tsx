/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import type { AppState, AppAction, WorkoutLog, WeeklyChallenge } from '../types';
import { generateWeeklyChallenge, calculateChallengeProgress, getCurrentWeekStart } from '../services/challenges';

const STORAGE_KEY = 'form-app-state';

// ===== SAMPLE DATA =====
function generateSampleWorkouts(userId: string): WorkoutLog[] {
  const types = ['RUN', 'LIFT', 'YOGA', 'CYCLE', 'HIIT', 'SWIM', 'WALK'] as const;
  const workouts: WorkoutLog[] = [];
  const now = new Date();
  
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const type = types[Math.floor(Math.random() * types.length)];
    const duration = [15, 20, 30, 40, 45, 60, 75, 90][Math.floor(Math.random() * 8)];
    const intensity = ([1, 2, 3] as const)[Math.floor(Math.random() * 3)];
    const caloriesPerMinute = intensity === 1 ? 5 : intensity === 2 ? 8 : 12;

    workouts.push({
      id: `workout-${i}-${Date.now()}`,
      userId,
      activityType: type,
      durationMinutes: duration,
      intensity,
      loggedAt: date,
      caloriesBurned: duration * caloriesPerMinute,
      notes: i % 3 === 0 ? 'Felt great today!' : undefined,
    });
  }

  return workouts.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
}

// ===== INITIAL STATE =====
function getInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects
      if (parsed.user?.createdAt) parsed.user.createdAt = new Date(parsed.user.createdAt);
      if (parsed.workouts) {
        parsed.workouts = parsed.workouts.map((w: WorkoutLog) => ({
          ...w,
          loggedAt: new Date(w.loggedAt),
        }));
      }
      if (parsed.activeChallenge?.completedAt) {
        parsed.activeChallenge.completedAt = new Date(parsed.activeChallenge.completedAt);
      }
      if (parsed.challengeHistory) {
        parsed.challengeHistory = parsed.challengeHistory.map((c: WeeklyChallenge) => ({
          ...c,
          completedAt: c.completedAt ? new Date(c.completedAt) : undefined,
        }));
      }
      return {
        ...parsed,
        aiMessages: [],
        aiState: 'idle' as const,
        currentScreen: parsed.isOnboarded ? 'dashboard' : 'onboarding',
        activeChallenge: parsed.activeChallenge || null,
        challengeHistory: parsed.challengeHistory || [],
      };
    }
  } catch { /* ignore */ }

  return {
    user: null,
    workouts: [],
    aiMessages: [],
    aiState: 'idle',
    isOnboarded: false,
    currentScreen: 'onboarding',
    activeChallenge: null,
    challengeHistory: [],
  };
}

// ===== REDUCER =====
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_WORKOUT':
      return { ...state, workouts: [action.payload, ...state.workouts] };
    case 'DELETE_WORKOUT':
      return { ...state, workouts: state.workouts.filter(w => w.id !== action.payload) };
    case 'ADD_AI_MESSAGE':
      return { ...state, aiMessages: [...state.aiMessages, action.payload] };
    case 'SET_AI_STATE':
      return { ...state, aiState: action.payload };
    case 'UPDATE_MESSAGE_FEEDBACK':
      return {
        ...state,
        aiMessages: state.aiMessages.map(m =>
          m.id === action.payload.id ? { ...m, feedback: action.payload.feedback } : m
        ),
      };
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'COMPLETE_ONBOARDING': {
      const userId = state.user?.name || 'user';
      const sampleWorkouts = generateSampleWorkouts(userId);
      const challenge = state.user ? generateWeeklyChallenge(state.user, sampleWorkouts) : null;
      return { ...state, isOnboarded: true, workouts: sampleWorkouts, currentScreen: 'dashboard', activeChallenge: challenge };
    }
    case 'CLEAR_AI_MESSAGES':
      return { ...state, aiMessages: [] };
    case 'SET_CHALLENGE':
      return { ...state, activeChallenge: action.payload };
    case 'UPDATE_CHALLENGE_PROGRESS':
      if (!state.activeChallenge) return state;
      return {
        ...state,
        activeChallenge: { ...state.activeChallenge, current: action.payload },
      };
    case 'COMPLETE_CHALLENGE': {
      if (!state.activeChallenge) return state;
      const completed: WeeklyChallenge = {
        ...state.activeChallenge,
        status: 'completed',
        completedAt: new Date(),
      };
      return {
        ...state,
        activeChallenge: completed,
        challengeHistory: [completed, ...state.challengeHistory],
      };
    }
    default:
      return state;
  }
}

// ===== CONTEXT =====
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  // Persist to localStorage (excluding AI messages and transient state)
  useEffect(() => {
    const toStore = {
      user: state.user,
      workouts: state.workouts,
      isOnboarded: state.isOnboarded,
      activeChallenge: state.activeChallenge,
      challengeHistory: state.challengeHistory,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [state.user, state.workouts, state.isOnboarded, state.activeChallenge, state.challengeHistory]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ===== DERIVED DATA HOOKS =====

export function useWorkoutStats() {
  const { state } = useApp();
  const { workouts, user } = state;
  const now = new Date();

  // This week's workouts (Mon-Sun)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeekWorkouts = workouts.filter(w => new Date(w.loggedAt) >= startOfWeek);
  const weeklyMinutes = thisWeekWorkouts.reduce((sum, w) => sum + w.durationMinutes, 0);
  const weeklyCalories = thisWeekWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const weeklyGoal = user?.daysPerWeek || 5;
  const weeklyCount = thisWeekWorkouts.length;

  // Streak calculation
  let streak = 0;
  const daySet = new Set<string>();
  workouts.forEach(w => {
    const d = new Date(w.loggedAt);
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  
  const checkDate = new Date(now);
  checkDate.setHours(0, 0, 0, 0);
  while (daySet.has(`${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`)) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Total all-time workouts
  const totalWorkouts = workouts.length;

  // Last week's stats for delta comparison
  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekWorkouts = workouts.filter(
    w => new Date(w.loggedAt) >= lastWeekStart && new Date(w.loggedAt) < startOfWeek
  );
  const lastWeekMinutes = lastWeekWorkouts.reduce((sum, w) => sum + w.durationMinutes, 0);

  const minutesDelta = lastWeekMinutes > 0
    ? Math.round(((weeklyMinutes - lastWeekMinutes) / lastWeekMinutes) * 100)
    : 0;

  return {
    weeklyMinutes,
    weeklyCalories,
    weeklyGoal,
    weeklyCount,
    streak,
    totalWorkouts,
    minutesDelta,
    thisWeekWorkouts,
    recentWorkouts: workouts.slice(0, 5),
  };
}

// ===== CHALLENGE HOOK =====

export function useChallenge() {
  const { state, dispatch } = useApp();
  const { activeChallenge, workouts, user, challengeHistory } = state;
  const currentWeek = getCurrentWeekStart();

  // Auto-generate a challenge if none exists or if the week has changed
  useEffect(() => {
    if (!user) return;
    
    const needsNewChallenge =
      !activeChallenge ||
      (activeChallenge.weekStart !== currentWeek && activeChallenge.status !== 'active');

    // If challenge is from a previous week and still active, mark it failed and generate new
    if (activeChallenge && activeChallenge.weekStart !== currentWeek && activeChallenge.status === 'active') {
      dispatch({ type: 'COMPLETE_CHALLENGE' }); // archive it
      const newChallenge = generateWeeklyChallenge(user, workouts);
      dispatch({ type: 'SET_CHALLENGE', payload: newChallenge });
      return;
    }

    if (needsNewChallenge) {
      const newChallenge = generateWeeklyChallenge(user, workouts);
      dispatch({ type: 'SET_CHALLENGE', payload: newChallenge });
    }
  }, [user, currentWeek, activeChallenge, workouts, dispatch]);

  // Auto-update progress whenever workouts change
  const progress = useMemo(() => {
    if (!activeChallenge || activeChallenge.status === 'completed') return activeChallenge?.current || 0;
    return calculateChallengeProgress(activeChallenge, workouts);
  }, [activeChallenge, workouts]);

  // Sync progress and auto-complete
  useEffect(() => {
    if (!activeChallenge || activeChallenge.status === 'completed') return;
    
    if (progress !== activeChallenge.current) {
      dispatch({ type: 'UPDATE_CHALLENGE_PROGRESS', payload: progress });
    }
    
    if (progress >= activeChallenge.target && activeChallenge.status === 'active') {
      dispatch({ type: 'COMPLETE_CHALLENGE' });
    }
  }, [progress, activeChallenge, dispatch]);

  const refreshChallenge = () => {
    if (!user) return;
    const newChallenge = generateWeeklyChallenge(user, workouts);
    dispatch({ type: 'SET_CHALLENGE', payload: newChallenge });
  };

  return {
    challenge: activeChallenge,
    progress,
    history: challengeHistory,
    refreshChallenge,
    isCompleted: activeChallenge?.status === 'completed',
    percentComplete: activeChallenge ? Math.min((progress / activeChallenge.target) * 100, 100) : 0,
  };
}
