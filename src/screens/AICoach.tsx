import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAIChat } from '../hooks/useAIChat';
import { ACTIVITY_META, GOAL_META } from '../types';

import './AICoach.css';

function relativeDate(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

export default function AICoach() {
  const { state, dispatch } = useApp();
  const { messages, aiState, isStreaming, isGeminiEnabled, connectionError, sendMessage, getRecommendation, cancelStream } = useAIChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const user = state.user!;
  const recentWorkouts = state.workouts.slice(0, 5);

  // Deduplicate messages (streaming updates create duplicates)
  const uniqueMessages = messages.reduce((acc, msg) => {
    const existing = acc.findIndex(m => m.id === msg.id);
    if (existing >= 0) {
      acc[existing] = msg;
    } else {
      acc.push(msg);
    }
    return acc;
  }, [] as typeof messages);

  // Scroll to bottom on new messages
  const lastMessageContent = uniqueMessages[uniqueMessages.length - 1]?.content;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [uniqueMessages.length, lastMessageContent]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-coach">
      {/* LEFT: Context Panel */}
      <aside className="ai-coach__context">
        <div className="ai-coach__user-card">
          <div className="ai-coach__avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="type-card-title" style={{ fontSize: 'var(--text-xl)' }}>{user.name}</span>
            <span className="ai-coach__goal-badge type-micro-label">
              {GOAL_META[user.goal]?.label}
            </span>
          </div>
        </div>

        <div className="ai-coach__context-section">
          <span className="type-micro-label text-muted">THIS WEEK</span>
          <div className="ai-coach__workout-list">
            {recentWorkouts.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>No workouts yet</p>
            ) : (
              recentWorkouts.map((w) => (
                <div key={w.id} className="ai-coach__workout-row">
                  <span>{ACTIVITY_META[w.activityType]?.icon}</span>
                  <span className="ai-coach__workout-name">
                    {ACTIVITY_META[w.activityType]?.label}
                  </span>
                  <span className="type-timestamp text-muted">{w.durationMinutes}m</span>
                  <span className="type-timestamp text-muted">{relativeDate(w.loggedAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ai-coach__context-divider" />

        {/* Connection Status */}
        <div className="ai-coach__connection-status">
          <div className={`ai-coach__status-dot ${isGeminiEnabled ? 'ai-coach__status-dot--live' : 'ai-coach__status-dot--sim'}`} />
          <span className="type-timestamp text-muted">
            {isGeminiEnabled ? 'Gemini Connected' : 'Simulated Mode'}
          </span>
        </div>

        <div className="ai-coach__context-divider" />

        <div className="ai-coach__active-goal">
          <span className="type-micro-label text-accent">
            GOAL: {GOAL_META[user.goal]?.label.toUpperCase()}
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm btn-full"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'log' })}
          style={{ marginTop: 'auto' }}
        >
          + Log a workout
        </button>
      </aside>

      {/* RIGHT: Message Thread */}
      <main className="ai-coach__thread">
        <div className="ai-coach__thread-header">
          <div className="ai-coach__thread-title-row">
            <h2 className="type-card-title">AI COACH</h2>
            {isGeminiEnabled && (
              <span className="ai-coach__live-badge type-micro-label">LIVE</span>
            )}
          </div>
          <div className="ai-coach__thread-actions">
            {isStreaming && (
              <button className="btn btn-ghost btn-sm text-danger" onClick={cancelStream}>
                ■ Stop
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                dispatch({ type: 'CLEAR_AI_MESSAGES' });
                getRecommendation();
              }}
              disabled={isStreaming}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Connection Error Banner */}
        {connectionError && (
          <div className="ai-coach__error-banner">
            <span>⚠ {connectionError}</span>
          </div>
        )}

        <div className="ai-coach__messages">
          {uniqueMessages.length === 0 ? (
            <div className="ai-coach__empty">
              <h3 className="type-page-title text-primary">
                Ask me anything about your training.
              </h3>
              <p className="type-ai text-secondary" style={{ marginTop: 'var(--space-4)' }}>
                {isGeminiEnabled
                  ? 'Powered by Gemini — I have full context of your training history.'
                  : 'Connect a Gemini API key for personalised AI coaching, or use simulated mode.'}
              </p>
              <button
                className="btn btn-primary btn-lg"
                onClick={getRecommendation}
                disabled={isStreaming}
                style={{ marginTop: 'var(--space-8)' }}
              >
                Get my recommendation →
              </button>
            </div>
          ) : (
            <>
              {uniqueMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ai-message ${
                    msg.role === 'user' ? 'ai-message--user' : 'ai-message--assistant'
                  } ${msg.safetyLevel === 'block' ? 'ai-message--block' : ''} ${
                    msg.safetyLevel === 'caution' ? 'ai-message--caution' : ''
                  }`}
                >
                  {/* Safety warning header */}
                  {msg.type === 'safety_warning' && msg.safetyLevel === 'caution' && (
                    <div className="ai-message__safety-header">
                      <span>⚠️</span>
                      <span className="type-micro-label">A COACHING NOTE</span>
                    </div>
                  )}
                  {msg.type === 'safety_warning' && msg.safetyLevel === 'block' && (
                    <div className="ai-message__safety-header ai-message__safety-header--block">
                      <span>🛑</span>
                      <span className="type-card-title" style={{ fontSize: 'var(--text-xl)' }}>
                        This is outside what I can safely help with
                      </span>
                    </div>
                  )}

                  <p className={msg.role === 'assistant' ? 'type-ai' : ''}>
                    {msg.content}
                    {isStreaming && msg === uniqueMessages[uniqueMessages.length - 1] && msg.role === 'assistant' && (
                      <span className="ai-cursor">|</span>
                    )}
                  </p>
                  
                  <span className="type-timestamp text-muted" style={{ marginTop: 'var(--space-2)', display: 'block' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Feedback buttons for assistant messages */}
                  {msg.role === 'assistant' && msg.type !== 'safety_warning' && !isStreaming && (
                    <div className="ai-message__feedback">
                      <button
                        className={`btn btn-ghost btn-sm ${msg.feedback === 'helpful' ? 'text-accent' : ''}`}
                        onClick={() => dispatch({ type: 'UPDATE_MESSAGE_FEEDBACK', payload: { id: msg.id, feedback: 'helpful' } })}
                      >
                        👍 Helpful
                      </button>
                      <button
                        className={`btn btn-ghost btn-sm ${msg.feedback === 'not_helpful' ? 'text-danger' : ''}`}
                        onClick={() => dispatch({ type: 'UPDATE_MESSAGE_FEEDBACK', payload: { id: msg.id, feedback: 'not_helpful' } })}
                      >
                        👎 Not for me
                      </button>
                    </div>
                  )}

                  {/* Safety acknowledge button */}
                  {msg.safetyLevel === 'block' && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-4)' }}>
                      Let's set a realistic goal instead
                    </button>
                  )}
                </div>
              ))}

              {/* Thinking dots */}
              {aiState === 'queued' && (
                <div className="ai-message ai-message--assistant">
                  <div className="ai-thinking">
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="ai-coach__input-bar">
          <textarea
            ref={inputRef}
            className="ai-coach__input"
            placeholder={isGeminiEnabled ? 'Ask your AI coach...' : 'Ask anything...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            Send
          </button>
        </div>
        <p className="ai-coach__disclaimer type-timestamp text-muted">
          {isGeminiEnabled
            ? 'Powered by Gemini. FORM AI provides fitness guidance, not medical advice.'
            : 'FORM AI provides fitness guidance, not medical advice. Connect Gemini for real AI.'}
        </p>
      </main>
    </div>
  );
}
