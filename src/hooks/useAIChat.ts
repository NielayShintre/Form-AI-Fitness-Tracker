import { useState, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { evaluateSafety, generateAIResponse, SAFETY_BLOCK_MESSAGE, SAFETY_CAUTION_MESSAGE, filterAIOutput } from '../services/safety';
import { hasApiKey, buildSystemPrompt, streamGeminiResponse } from '../services/gemini';
import type { AIMessage } from '../types';

export function useAIChat() {
  const { state, dispatch } = useApp();
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Check if Gemini is available
  const isGeminiEnabled = hasApiKey();

  // Cancel any ongoing stream
  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    if (streamRef.current) clearInterval(streamRef.current);
    setIsStreaming(false);
    dispatch({ type: 'SET_AI_STATE', payload: 'idle' });
  }, [dispatch]);

  // ===== SIMULATED STREAMING (fallback when no API key) =====
  const simulateStream = useCallback((
    responseContent: string,
    messageType: AIMessage['type'],
    safetyLevel: AIMessage['safetyLevel'],
  ) => {
    const aiMsg: AIMessage = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: messageType,
      safetyLevel,
    };
    dispatch({ type: 'ADD_AI_MESSAGE', payload: aiMsg });

    let charIndex = 0;
    return new Promise<void>((resolve) => {
      streamRef.current = setInterval(() => {
        charIndex += 2;
        if (charIndex >= responseContent.length) {
          charIndex = responseContent.length;
          clearInterval(streamRef.current);
          setIsStreaming(false);
          dispatch({ type: 'SET_AI_STATE', payload: 'complete' });
          resolve();
        }
        const updatedMsg: AIMessage = {
          ...aiMsg,
          content: responseContent.slice(0, charIndex),
        };
        dispatch({ type: 'ADD_AI_MESSAGE', payload: updatedMsg });
      }, 15);
    });
  }, [dispatch]);

  // ===== GEMINI STREAMING =====
  const streamFromGemini = useCallback(async (
    conversationMessages: AIMessage[],
  ): Promise<void> => {
    if (!state.user) return;

    const systemPrompt = buildSystemPrompt(
      state.user,
      state.workouts.slice(0, 15),
      state.activeChallenge,
    );

    // Map conversation to Gemini format (last 10 messages for context)
    const history = conversationMessages
      .filter((m) => m.content.trim().length > 0)
      .slice(-10)
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }));

    // Create the AI message placeholder
    const aiMsgId = `msg-${Date.now()}-ai`;
    const aiMsg: AIMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'response',
      safetyLevel: 'ok',
    };
    dispatch({ type: 'ADD_AI_MESSAGE', payload: aiMsg });
    dispatch({ type: 'SET_AI_STATE', payload: 'streaming' });
    setIsStreaming(true);
    setConnectionError(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let accumulated = '';

    await streamGeminiResponse(
      systemPrompt,
      history,
      {
        onToken: (token) => {
          accumulated += token;
          // Update message with accumulated text
          dispatch({
            type: 'ADD_AI_MESSAGE',
            payload: { ...aiMsg, content: accumulated },
          });
        },
        onComplete: (fullText) => {
          // Layer 3: Post-filter the completed response
          const { filtered } = filterAIOutput(fullText);
          dispatch({
            type: 'ADD_AI_MESSAGE',
            payload: { ...aiMsg, content: filtered },
          });
          setIsStreaming(false);
          dispatch({ type: 'SET_AI_STATE', payload: 'complete' });
        },
        onError: (error) => {
          setIsStreaming(false);

          if (error.message === 'SAFETY_BLOCKED') {
            // Gemini's own safety filter caught something
            dispatch({
              type: 'ADD_AI_MESSAGE',
              payload: {
                ...aiMsg,
                content: SAFETY_BLOCK_MESSAGE,
                type: 'safety_warning',
                safetyLevel: 'block',
              },
            });
            dispatch({ type: 'SET_AI_STATE', payload: 'complete' });
          } else if (error.message === 'NO_API_KEY') {
            // Shouldn't happen but handle gracefully
            setConnectionError('No API key configured.');
            dispatch({ type: 'SET_AI_STATE', payload: 'error' });
          } else {
            // Network/quota/auth errors
            setConnectionError(error.message);
            // If we have partial content, keep it
            if (accumulated.length > 0) {
              dispatch({
                type: 'ADD_AI_MESSAGE',
                payload: { ...aiMsg, content: accumulated + '\n\n*[Connection interrupted]*' },
              });
            }
            dispatch({ type: 'SET_AI_STATE', payload: 'error' });
          }
        },
      },
      abortController.signal,
    );
  }, [state.user, state.workouts, state.activeChallenge, dispatch]);

  // ===== SEND MESSAGE =====
  const sendMessage = useCallback(async (content: string) => {
    if (!state.user) return;

    // Add user message
    const userMsg: AIMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date(),
      type: 'response',
    };
    dispatch({ type: 'ADD_AI_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_AI_STATE', payload: 'queued' });

    // Layer 1: Client-side pre-filter
    const safetyLevel = evaluateSafety(content, state.user.level);

    if (safetyLevel === 'block') {
      await new Promise((r) => setTimeout(r, 500));
      dispatch({ type: 'SET_AI_STATE', payload: 'streaming' });
      setIsStreaming(true);
      await simulateStream(SAFETY_BLOCK_MESSAGE, 'safety_warning', 'block');
      return;
    }

    if (safetyLevel === 'caution') {
      await new Promise((r) => setTimeout(r, 500));
      dispatch({ type: 'SET_AI_STATE', payload: 'streaming' });
      setIsStreaming(true);
      await simulateStream(SAFETY_CAUTION_MESSAGE, 'safety_warning', 'caution');
      return;
    }

    // If Gemini is available, use it. Otherwise, fall back to simulated.
    if (isGeminiEnabled) {
      await new Promise((r) => setTimeout(r, 300)); // Brief queued state for UX
      const allMessages = [...state.aiMessages, userMsg];
      await streamFromGemini(allMessages);
    } else {
      await new Promise((r) => setTimeout(r, 800));
      dispatch({ type: 'SET_AI_STATE', payload: 'streaming' });
      setIsStreaming(true);

      const responseContent = generateAIResponse(
        content,
        state.user.name,
        state.user.goal,
        state.workouts.slice(0, 10).map((w) => ({
          activityType: w.activityType,
          durationMinutes: w.durationMinutes,
          loggedAt: w.loggedAt,
        })),
      );
      await simulateStream(responseContent, 'response', 'ok');
    }
  }, [state.user, state.workouts, state.aiMessages, dispatch, isGeminiEnabled, simulateStream, streamFromGemini]);

  // ===== GET RECOMMENDATION =====
  const getRecommendation = useCallback(async () => {
    if (!state.user) return;

    dispatch({ type: 'SET_AI_STATE', payload: 'queued' });

    if (isGeminiEnabled) {
      // Add a synthetic user message to trigger recommendation
      const recMsg: AIMessage = {
        id: `msg-${Date.now()}-user-rec`,
        role: 'user',
        content: 'Based on my recent activity and goals, give me a specific training recommendation for today.',
        timestamp: new Date(),
        type: 'response',
      };
      dispatch({ type: 'ADD_AI_MESSAGE', payload: recMsg });
      await new Promise((r) => setTimeout(r, 300));
      await streamFromGemini([recMsg]);
    } else {
      await new Promise((r) => setTimeout(r, 600));
      dispatch({ type: 'SET_AI_STATE', payload: 'streaming' });
      setIsStreaming(true);

      const responseContent = generateAIResponse(
        'Give me my recommendation',
        state.user.name,
        state.user.goal,
        state.workouts.slice(0, 10).map((w) => ({
          activityType: w.activityType,
          durationMinutes: w.durationMinutes,
          loggedAt: w.loggedAt,
        })),
      );
      await simulateStream(responseContent, 'recommendation', 'ok');
    }
  }, [state.user, state.workouts, dispatch, isGeminiEnabled, simulateStream, streamFromGemini]);

  return {
    messages: state.aiMessages,
    aiState: state.aiState,
    isStreaming,
    isGeminiEnabled,
    connectionError,
    sendMessage,
    getRecommendation,
    cancelStream,
  };
}
