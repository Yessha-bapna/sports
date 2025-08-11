import React, { useState, useEffect } from 'react';
import './styles.css';
import type { Match } from './types';
import { matchAPI } from './services/api';
import MatchSetup from './components/MatchSetup';
import LiveScore from './components/LiveScore';
import socketService from './services/socket';

const App: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'matches'>('matches');

  useEffect(() => {
    fetchMatches();
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await matchAPI.getAll();
      setMatches(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch matches');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchCreated = (newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev]);
    setSelectedMatch(newMatch);
  };

  const handleMatchSelect = (match: Match) => {
    if (selectedMatch?._id === match._id) return; // prevent duplicate selection
    setSelectedMatch(match);
  };

  const handleMatchComplete = (matchId: string) => {
    setMatches(prev => prev.map(m => m._id === matchId ? { ...m, status: 'completed' } : m));
  };

  return (
    <div>
      <header className="header">
        <div className="container header-inner">
          <h1 className="header-title">Real-Time Sports Scoring</h1>
          <nav style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${view === 'matches' ? 'btn-primary' : ''}`} onClick={() => setView('matches')}>Matches</button>
          </nav>
        </div>
      </header>

      <main className="container main">
        {view === 'matches' && (
          <div className="layout">
            {/* Left Column: Match List and Setup */}
            <div className="left-col">
              {/* Add Match */}
              <div className="card" style={{ marginBottom: 12 }}>
                <h2>Create Match</h2>
                <MatchSetup onMatchCreated={handleMatchCreated} />
              </div>
              <div className="card">
                <h2>Matches</h2>
                {loading && <p className="help">Loading matches...</p>}
                {error && <div className="alert error">{error}</div>}
                <ul className="list">
                  {matches.map(match => (
                    <li
                      key={match._id}
                      onClick={() => handleMatchSelect(match)}
                      className={`list-item ${selectedMatch?._id === match._id ? 'active' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{match.matchName}</div>
                        <span className={`badge ${match.status === 'live' ? 'live' : match.status === 'completed' ? 'done' : 'info'}`}>
                          {match.sportType} · {match.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Live Score Display */}
            <div className="right-col">
              {selectedMatch ? (
                <div className="card">
                  <LiveScore match={selectedMatch} onMatchComplete={handleMatchComplete} />
                </div>
              ) : (
                <div className="card empty">
                  <h2>Welcome!</h2>
                  <p>Select a match from the list or create a new one to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p>© {new Date().getFullYear()} Sports Scoring App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
