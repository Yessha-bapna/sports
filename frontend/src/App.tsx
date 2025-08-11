import React, { useState, useEffect } from 'react';
import './styles.css';
import type { Match, Booking, Venue } from './types';
import { matchAPI } from './services/api';
import MatchSetup from './components/MatchSetup';
import LiveScore from './components/LiveScore';
import socketService from './services/socket';
import VenueList from './components/VenueList';
import VenueAdd from './components/VenueAdd';
import VenueDetails from './components/VenueDetails';
import BookingMatchSetup from './components/BookingMatchSetup';

const App: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'matches' | 'venues' | 'addVenue' | 'venueDetails' | 'bookingSetup'>('venues');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedVenueForBooking, setSelectedVenueForBooking] = useState<Venue | null>(null);
  const [liveInitialTab, setLiveInitialTab] = useState<'add' | 'view'>('add');

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
            <button className={`btn ${view === 'venues' ? 'btn-primary' : ''}`} onClick={() => setView('venues')}>Venues</button>
            <button className={`btn ${view === 'addVenue' ? 'btn-primary' : ''}`} onClick={() => setView('addVenue')}>Add Venue</button>
          </nav>
        </div>
      </header>

      <main className="container main">
        {view === 'matches' && (
          <div className="layout">
            {/* Left Column: Match List and Setup */}
            <div className="left-col">
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
                  <LiveScore match={selectedMatch} onMatchComplete={handleMatchComplete} initialTab={liveInitialTab} />
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

        {view === 'venues' && (
          <div className="card">
            <VenueList onViewDetails={(id) => { setSelectedVenueId(id); setView('venueDetails'); }} />
          </div>
        )}

        {view === 'addVenue' && (
          <div className="card">
            <VenueAdd />
          </div>
        )}

        {view === 'venueDetails' && selectedVenueId && (
          <div className="card">
            <VenueDetails
              venueId={selectedVenueId}
              onBack={() => setView('venues')}
              onSetupMatch={(booking, venue) => {
                setSelectedBooking(booking);
                setSelectedVenueForBooking(venue as any);
                setView('bookingSetup');
              }}
              onOpenMatch={(m: Match, tab: 'add' | 'view') => {
                setSelectedMatch(m);
                setLiveInitialTab(tab);
                setView('matches');
              }}
            />
          </div>
        )}

        {view === 'bookingSetup' && selectedBooking && selectedVenueForBooking && (
          <div className="card">
            <BookingMatchSetup
              booking={selectedBooking}
              venue={selectedVenueForBooking}
              onCancel={() => setView('venueDetails')}
              onCreated={(m: Match) => {
                setMatches(prev => [m, ...prev]);
                setSelectedMatch(m);
                setView('matches');
              }}
            />
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
