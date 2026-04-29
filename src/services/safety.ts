// ===== Safety Evaluation Service =====

const BLOCKED_KEYWORDS = [
  'starve', 'no food', 'laxative', 'purge', 'hurt myself',
  'not eating', 'crash diet', 'dangerous', 'extreme',
];

const SAFETY_RULES = {
  maxWeightLossKgPerWeek: 1.0,
  maxHoursPerDayBeginner: 1.5,
  maxHoursPerDayIntermediate: 2.5,
  maxHoursPerDayAdvanced: 4.0,
};

export function evaluateSafety(input: string, userLevel: string): 'ok' | 'caution' | 'block' {
  const lower = input.toLowerCase();

  // Hard block on dangerous keywords
  if (BLOCKED_KEYWORDS.some(kw => lower.includes(kw))) return 'block';

  // Weight loss speed check
  const weightMatch = lower.match(/(\d+\.?\d*)\s*kg?\s*(?:per|\/|a)\s*week/);
  if (weightMatch && parseFloat(weightMatch[1]) > SAFETY_RULES.maxWeightLossKgPerWeek) return 'caution';

  // Duration check
  const durationMatch = lower.match(/(\d+\.?\d*)\s*hours?\s*(?:per|\/|a)\s*day/);
  if (durationMatch) {
    const levelKey = `maxHoursPerDay${userLevel.charAt(0).toUpperCase() + userLevel.slice(1).toLowerCase()}` as keyof typeof SAFETY_RULES;
    const max = SAFETY_RULES[levelKey] as number;
    if (max && parseFloat(durationMatch[1]) > max) return 'caution';
  }

  return 'ok';
}

// AI response generation (simulated — no API key needed)
export function generateAIResponse(
  userMessage: string,
  userName: string,
  goal: string,
  recentWorkouts: Array<{ activityType: string; durationMinutes: number; loggedAt: Date }>
): string {
  const lastWorkout = recentWorkouts[0];
  const workoutCount = recentWorkouts.length;

  // Contextual responses based on user input
  const lower = userMessage.toLowerCase();

  if (lower.includes('recommendation') || lower.includes('what should') || lower.includes('suggest')) {
    if (lastWorkout) {
      const daysSinceLastWorkout = Math.floor(
        (Date.now() - new Date(lastWorkout.loggedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastWorkout === 0) {
        return `You already trained today with a ${lastWorkout.durationMinutes}-minute ${lastWorkout.activityType.toLowerCase()} session, ${userName}. Tomorrow, consider active recovery — a 20-minute mobility flow or easy walk would complement today's effort. Your body adapts during rest, not just during training.`;
      }
      if (daysSinceLastWorkout <= 2) {
        return `Based on your recent ${lastWorkout.activityType.toLowerCase()} session, I'd suggest switching modalities. A 30-minute moderate-intensity session focusing on a different muscle group would balance your training load. Your ${goal.toLowerCase().replace('_', ' ')} goal benefits from variety.`;
      }
      return `It's been ${daysSinceLastWorkout} days since your last workout, ${userName}. Today would be a strong day to train — start with 20 minutes at moderate intensity and build from there. Consistency beats intensity for ${goal.toLowerCase().replace('_', ' ')}.`;
    }
    return `Welcome to your training journey, ${userName}. Start with a 20-minute session today at an easy pace. The first two weeks are about building the habit, not pushing limits. Pick any activity you genuinely enjoy — adherence is the only metric that matters right now.`;
  }

  if (lower.includes('rest') || lower.includes('recovery') || lower.includes('tired')) {
    return `Rest is when your body actually builds strength, ${userName}. If you're feeling fatigued, take today off or do a gentle 15-minute walk. With ${workoutCount} sessions logged, you've earned recovery time. Listen to your body — chronic fatigue is a sign you need more rest, not less.`;
  }

  if (lower.includes('progress') || lower.includes('improving') || lower.includes('better')) {
    return `You've logged ${workoutCount} workouts, ${userName}. Consistency is the clearest indicator of progress, and you're building a real pattern here. For your ${goal.toLowerCase().replace('_', ' ')} goal, focus on gradual progression — increasing duration by 5 minutes or adding one session per week over the next month.`;
  }

  if (lower.includes('nutrition') || lower.includes('diet') || lower.includes('eat')) {
    return `I'm focused on your training, ${userName}. For nutrition guidance, I'd recommend consulting a registered dietitian who can create a plan aligned with your ${goal.toLowerCase().replace('_', ' ')} goal. What I can help with is structuring your workouts to complement your energy availability.`;
  }

  if (lower.includes('injury') || lower.includes('pain') || lower.includes('hurt')) {
    return `${userName}, any persistent pain or injury should be evaluated by a healthcare professional before continuing training. In the meantime, avoid movements that cause discomfort. I can help you plan around limitations once you have clearance, but diagnosing injuries is outside my scope.`;
  }

  // Default contextual response
  return `Here's what I'd focus on today, ${userName}: a balanced ${Math.min(45, 20 + workoutCount)}‑minute session at moderate intensity. Your recent activity shows you respond well to structured training. For your ${goal.toLowerCase().replace('_', ' ')} goal, mixing cardio and resistance work in a 60/40 split tends to produce the best results at your stage.`;
}

export const SAFETY_BLOCK_MESSAGE = "This is outside what I can safely help with. Some fitness goals can be harmful without proper medical supervision. I'd recommend speaking with a healthcare professional or certified trainer who can provide personalised guidance for your specific situation. Let's focus on setting a realistic, healthy goal that you can sustain long-term.";

export const SAFETY_CAUTION_MESSAGE = "A coaching note: The pace you're describing may be faster than what's generally recommended for sustainable progress. Rapid changes can increase injury risk and are harder to maintain. Let me suggest a more gradual approach that's proven to produce lasting results.";

// ===== Layer 3: Output Post-Filter =====
// Scans AI-generated responses for content that shouldn't have been generated

const OUTPUT_BLOCKLIST = [
  // Medical claims
  'diagnos', 'prescri', 'take this medication', 'this drug',
  // Eating disorder patterns
  'skip meals', 'don\'t eat', 'water fast', 'under 800 calories',
  // Supplement pushing
  'buy this supplement', 'you need creatine', 'take steroids',
  // Unrealistic promises
  'guaranteed results', 'lose 10', 'transform in 7 days',
];

export function filterAIOutput(response: string): { safe: boolean; filtered: string } {
  const lower = response.toLowerCase();

  for (const term of OUTPUT_BLOCKLIST) {
    if (lower.includes(term)) {
      return {
        safe: false,
        filtered: `${response}\n\n⚠️ *Note: Always consult a healthcare professional before making significant changes to your fitness routine.*`,
      };
    }
  }

  return { safe: true, filtered: response };
}
