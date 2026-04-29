// ===== ENUMS =====

export type ActivityType = 'RUN' | 'CYCLE' | 'LIFT' | 'YOGA' | 'SWIM' | 'HIIT' | 'WALK' | 'OTHER';

export type FitnessGoal = 'LOSE_WEIGHT' | 'BUILD_STRENGTH' | 'STAY_ACTIVE' | 'FLEXIBILITY';

export type FitnessLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type Intensity = 1 | 2 | 3;

export type SafetyLevel = 'ok' | 'caution' | 'block';

export type AIState = 'idle' | 'queued' | 'streaming' | 'complete' | 'error' | 'dismissed';

export type MessageType = 'recommendation' | 'response' | 'safety_warning';

export type Feedback = 'helpful' | 'not_helpful' | null;

export type ChallengeCategory = 'sessions' | 'minutes' | 'variety' | 'recovery' | 'intensity';
export type ChallengeStatus = 'active' | 'completed' | 'failed';

// ===== INTERFACES =====

export interface UserProfile {
  name: string;
  age: number;
  goal: FitnessGoal;
  level: FitnessLevel;
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  createdAt: Date;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  activityType: ActivityType;
  durationMinutes: number;
  intensity: Intensity;
  notes?: string;
  loggedAt: Date;
  aiTip?: string;
  caloriesBurned?: number;
}

export interface AIMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  type: MessageType;
  safetyLevel?: SafetyLevel;
  feedback?: Feedback;
}

export interface Delta {
  value: number;
  direction: 'up' | 'down';
  sentiment: 'good' | 'bad';
}

export interface HeatmapData {
  [date: string]: { count: number; minutes: number };
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  icon: string;
  target: number;
  current: number;
  unit: string;
  weekStart: string; // ISO date string of Monday
  status: ChallengeStatus;
  completedAt?: Date;
  isRestChallenge: boolean;
}

// ===== APP STATE =====

export interface AppState {
  user: UserProfile | null;
  workouts: WorkoutLog[];
  aiMessages: AIMessage[];
  aiState: AIState;
  isOnboarded: boolean;
  currentScreen: string;
  activeChallenge: WeeklyChallenge | null;
  challengeHistory: WeeklyChallenge[];
}

export type AppAction =
  | { type: 'SET_USER'; payload: UserProfile }
  | { type: 'ADD_WORKOUT'; payload: WorkoutLog }
  | { type: 'DELETE_WORKOUT'; payload: string }
  | { type: 'ADD_AI_MESSAGE'; payload: AIMessage }
  | { type: 'SET_AI_STATE'; payload: AIState }
  | { type: 'UPDATE_MESSAGE_FEEDBACK'; payload: { id: string; feedback: Feedback } }
  | { type: 'SET_SCREEN'; payload: string }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'CLEAR_AI_MESSAGES' }
  | { type: 'SET_CHALLENGE'; payload: WeeklyChallenge }
  | { type: 'UPDATE_CHALLENGE_PROGRESS'; payload: number }
  | { type: 'COMPLETE_CHALLENGE' };

// ===== ACTIVITY METADATA =====

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string }> = {
  RUN: { label: 'Run', icon: '🏃' },
  CYCLE: { label: 'Cycle', icon: '🚴' },
  LIFT: { label: 'Lift', icon: '🏋️' },
  YOGA: { label: 'Yoga', icon: '🧘' },
  SWIM: { label: 'Swim', icon: '🏊' },
  HIIT: { label: 'HIIT', icon: '⚡' },
  WALK: { label: 'Walk', icon: '🚶' },
  OTHER: { label: 'Other', icon: '💪' },
};

export const GOAL_META: Record<FitnessGoal, { label: string; subtitle: string; icon: string }> = {
  LOSE_WEIGHT: { label: 'Lose Weight', subtitle: 'Burn fat and feel lighter', icon: '🔥' },
  BUILD_STRENGTH: { label: 'Build Strength', subtitle: 'Get stronger and more powerful', icon: '💪' },
  STAY_ACTIVE: { label: 'Stay Active', subtitle: 'Keep moving and stay healthy', icon: '⚡' },
  FLEXIBILITY: { label: 'Move Better', subtitle: 'Improve mobility and recovery', icon: '🧘' },
};

export const LEVEL_META: Record<FitnessLevel, { label: string; subtitle: string }> = {
  BEGINNER: { label: 'Just Starting', subtitle: 'Less than 1 year of training' },
  INTERMEDIATE: { label: 'Getting There', subtitle: '1–3 years, training regularly' },
  ADVANCED: { label: 'Seasoned', subtitle: '3+ years, training 4+ days/week' },
};
