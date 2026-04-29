import { useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Onboarding from './screens/Onboarding';
import Dashboard from './screens/Dashboard';
import LogWorkout from './screens/LogWorkout';
import AICoach from './screens/AICoach';
import Progress from './screens/Progress';
import './App.css';

function ResetModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="reset-overlay" onClick={onCancel}>
      <div className="reset-modal modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="type-card-title" style={{ marginBottom: 'var(--space-3)' }}>Reset FORM?</h3>
        <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
          This will clear all your data and return to onboarding.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Reset Everything</button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { state, dispatch } = useApp();
  const [showResetModal, setShowResetModal] = useState(false);

  // Show onboarding if not completed
  if (!state.isOnboarded) {
    return <Onboarding />;
  }

  const navigateTo = (screen: string) => dispatch({ type: 'SET_SCREEN', payload: screen });
  const currentScreen = state.currentScreen;

  const handleReset = () => {
    localStorage.removeItem('form-app-state');
    window.location.reload();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'log', label: 'Log', icon: '＋', accent: true },
    { id: 'coach', label: 'AI Coach', icon: '◎' },
    { id: 'progress', label: 'Progress', icon: '∿' },
  ];

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <Dashboard />;
      case 'log': return <LogWorkout />;
      case 'coach': return <AICoach />;
      case 'progress': return <Progress />;
      default: return <Dashboard />;
    }
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <nav className="app-shell__sidebar" aria-label="Main navigation">
        <div className="sidebar-logo" aria-label="FORM">F</div>
        
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentScreen === item.id ? 'nav-item--active' : ''}`}
            onClick={() => navigateTo(item.id)}
            aria-label={item.label}
          >
            <span className={`nav-item__icon ${item.accent ? 'text-accent' : ''}`}>{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}

        <div className="nav-divider" />
        <div className="nav-spacer" />
        
        <button
          className="nav-item"
          onClick={() => setShowResetModal(true)}
          aria-label="Reset app"
        >
          <span className="nav-item__icon">○</span>
          <span className="nav-label">Reset</span>
        </button>
      </nav>

      {/* Main Content */}
      <div className="app-shell__main">
        <header className="app-shell__topbar">
          <span className="type-timestamp text-muted">{formatDate()}</span>
          <span className="app-topbar__title type-micro-label text-muted">FORM</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigateTo('log')}>
            + Log Workout
          </button>
        </header>

        <main className="app-shell__content">
          {renderScreen()}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`bottom-nav__item ${currentScreen === item.id ? 'bottom-nav__item--active' : ''}`}
            onClick={() => navigateTo(item.id)}
          >
            <span className="bottom-nav__item__icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Reset confirmation modal */}
      {showResetModal && (
        <ResetModal onConfirm={handleReset} onCancel={() => setShowResetModal(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
