import type { WeeklyChallenge, WorkoutLog, UserProfile, ActivityType, ChallengeCategory } from '../types';

// Get the Monday of the current week as ISO string
export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// Count consecutive active days (streak)
function getConsecutiveActiveDays(workouts: WorkoutLog[]): number {
  const daySet = new Set<string>();
  workouts.forEach(w => {
    const d = new Date(w.loggedAt);
    daySet.add(d.toISOString().split('T')[0]);
  });
  let streak = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  while (daySet.has(check.toISOString().split('T')[0])) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

// Get unique activity types used this week
function getWeekActivityTypes(workouts: WorkoutLog[], weekStart: string): Set<ActivityType> {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const types = new Set<ActivityType>();
  workouts
    .filter(w => new Date(w.loggedAt) >= start && new Date(w.loggedAt) < end)
    .forEach(w => types.add(w.activityType));
  return types;
}

// Get this week's workouts
function getThisWeekWorkouts(workouts: WorkoutLog[], weekStart: string): WorkoutLog[] {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return workouts.filter(w => new Date(w.loggedAt) >= start && new Date(w.loggedAt) < end);
}

// Last week's stats for comparison
function getLastWeekStats(workouts: WorkoutLog[], weekStart: string) {
  const thisStart = new Date(weekStart);
  const lastStart = new Date(thisStart);
  lastStart.setDate(lastStart.getDate() - 7);
  const lastWeek = workouts.filter(
    w => new Date(w.loggedAt) >= lastStart && new Date(w.loggedAt) < thisStart
  );
  return {
    count: lastWeek.length,
    minutes: lastWeek.reduce((s, w) => s + w.durationMinutes, 0),
    types: new Set(lastWeek.map(w => w.activityType)).size,
  };
}

interface ChallengeTemplate {
  category: ChallengeCategory;
  icon: string;
  generate: (user: UserProfile, lastWeek: ReturnType<typeof getLastWeekStats>, streak: number) => {
    title: string;
    description: string;
    target: number;
    unit: string;
    isRestChallenge: boolean;
  };
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // SESSION-BASED
  {
    category: 'sessions',
    icon: '🎯',
    generate: (user, lastWeek) => {
      const target = Math.max(user.daysPerWeek, lastWeek.count + 1);
      return {
        title: `Log ${target} sessions`,
        description: `Complete ${target} workouts this week. Last week you did ${lastWeek.count}.`,
        target,
        unit: 'sessions',
        isRestChallenge: false,
      };
    },
  },
  // MINUTES-BASED
  {
    category: 'minutes',
    icon: '⏱',
    generate: (user, lastWeek) => {
      const base = lastWeek.minutes > 0 ? lastWeek.minutes : user.daysPerWeek * 30;
      const target = Math.round((base * 1.1) / 10) * 10; // 10% increase, rounded
      return {
        title: `Hit ${target} active minutes`,
        description: `Push past last week's ${lastWeek.minutes} minutes. Small increases compound.`,
        target,
        unit: 'min',
        isRestChallenge: false,
      };
    },
  },
  // VARIETY
  {
    category: 'variety',
    icon: '🔄',
    generate: (_user, lastWeek) => {
      const target = Math.max(3, lastWeek.types + 1);
      return {
        title: `Try ${target} different activities`,
        description: `Mix it up. You trained ${lastWeek.types} different way${lastWeek.types !== 1 ? 's' : ''} last week.`,
        target,
        unit: 'types',
        isRestChallenge: false,
      };
    },
  },
  // RECOVERY (triggered when streak is high)
  {
    category: 'recovery',
    icon: '🧘',
    generate: (_user, _lastWeek, streak) => ({
      title: 'Take 2 rest days',
      description: `You've been going ${streak} days straight. Recovery is where adaptation happens.`,
      target: 2,
      unit: 'rest days',
      isRestChallenge: true,
    }),
  },
  // INTENSITY PUSH
  {
    category: 'intensity',
    icon: '🔥',
    generate: (user) => {
      const target = user.level === 'BEGINNER' ? 1 : user.level === 'INTERMEDIATE' ? 2 : 3;
      return {
        title: `Complete ${target} hard session${target > 1 ? 's' : ''}`,
        description: 'Push your limits with high-intensity training this week.',
        target,
        unit: 'hard sessions',
        isRestChallenge: false,
      };
    },
  },
];

export function generateWeeklyChallenge(
  user: UserProfile,
  workouts: WorkoutLog[]
): WeeklyChallenge {
  const weekStart = getCurrentWeekStart();
  const streak = getConsecutiveActiveDays(workouts);
  const lastWeek = getLastWeekStats(workouts, weekStart);

  // If the user has been active 5+ consecutive days, force a recovery challenge
  let template: ChallengeTemplate;
  if (streak >= 5) {
    template = CHALLENGE_TEMPLATES.find(t => t.category === 'recovery')!;
  } else {
    // Pick a challenge based on variety — avoid repeating the same category
    const nonRecovery = CHALLENGE_TEMPLATES.filter(t => t.category !== 'recovery');
    template = nonRecovery[Math.floor(Math.random() * nonRecovery.length)];
  }

  const challenge = template.generate(user, lastWeek, streak);

  return {
    id: `challenge-${weekStart}-${Date.now()}`,
    ...challenge,
    category: template.category,
    icon: template.icon,
    current: 0,
    weekStart,
    status: 'active',
    isRestChallenge: challenge.isRestChallenge,
  };
}

// Calculate current progress for an active challenge based on this week's data
export function calculateChallengeProgress(
  challenge: WeeklyChallenge,
  workouts: WorkoutLog[]
): number {
  const thisWeek = getThisWeekWorkouts(workouts, challenge.weekStart);

  switch (challenge.category) {
    case 'sessions':
      return thisWeek.length;
    case 'minutes':
      return thisWeek.reduce((s, w) => s + w.durationMinutes, 0);
    case 'variety':
      return getWeekActivityTypes(workouts, challenge.weekStart).size;
    case 'intensity':
      return thisWeek.filter(w => w.intensity === 3).length;
    case 'recovery': {
      // Count days WITHOUT a workout this week
      const activeDays = new Set(
        thisWeek.map(w => new Date(w.loggedAt).toISOString().split('T')[0])
      );
      const start = new Date(challenge.weekStart);
      const now = new Date();
      let restDays = 0;
      const check = new Date(start);
      while (check <= now) {
        if (!activeDays.has(check.toISOString().split('T')[0])) restDays++;
        check.setDate(check.getDate() + 1);
      }
      return restDays;
    }
    default:
      return 0;
  }
}
