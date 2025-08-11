import React, { useState } from 'react';
import type { Booking, Venue, Match } from '../types';
import { matchAPI } from '../services/api';
import UmpireSelection from './UmpireSelection';

interface BookingMatchSetupProps {
  booking: Booking;
  venue: Venue;
  onCancel: () => void;
  onCreated: (match: Match) => void;
}

const BookingMatchSetup: React.FC<BookingMatchSetupProps> = ({ booking, venue, onCancel, onCreated }) => {
  const sport = (booking.sport as 'cricket' | 'badminton');
  const [form, setForm] = useState({
    matchName: `${sport.toUpperCase()} @ ${venue.name} (${new Date(booking.startAt).toLocaleDateString()})`,
    umpireId: '',
    team1: '',
    team2: '',
    totalOvers: 20,
    player1: '',
    player2: '',
    maxSets: 3,
    pointsToWin: 21,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.matchName || !form.umpireId) {
      setError('Match name and umpire are required.');
      return;
    }
    if (sport === 'cricket' && (!form.team1 || !form.team2)) {
      setError('Enter both team names for cricket.');
      return;
    }
    if (sport === 'badminton' && (!form.player1 || !form.player2)) {
      setError('Enter both player names for badminton.');
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        matchName: form.matchName,
        sportType: sport,
        umpireId: form.umpireId,
        venueId: venue._id,
        bookingId: booking._id,
        startTime: booking.startAt,
        endTime: booking.endAt,
        ...(sport === 'cricket' ? { team1: form.team1, team2: form.team2, totalOvers: parseInt(String(form.totalOvers), 10) } : {}),
        ...(sport === 'badminton' ? { player1: form.player1, player2: form.player2, maxSets: parseInt(String(form.maxSets), 10), pointsToWin: parseInt(String(form.pointsToWin), 10) } : {}),
      };
      const res = await matchAPI.create(payload);
      onCreated(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Setup Match from Booking</h2>
      <div className="help" style={{ marginBottom: 8 }}>
        {new Date(booking.startAt).toLocaleString()} - {new Date(booking.endAt).toLocaleTimeString()} · {booking.sport} {booking.court ? `· ${booking.court}` : ''}
      </div>
      {error && <div className="alert error" style={{ marginBottom: 8 }}>{error}</div>}
      <form onSubmit={submit}>
        <div>
          <label className="label">Match Name *</label>
          <input name="matchName" className="input" value={form.matchName} onChange={onChange} />
        </div>

        <UmpireSelection
          selectedUmpire={form.umpireId}
          onUmpireSelect={(id) => setForm(prev => ({ ...prev, umpireId: id }))}
          sportType={sport}
        />

        {sport === 'cricket' && (
          <div className="row">
            <div>
              <label className="label">Team 1 *</label>
              <input name="team1" className="input" value={form.team1} onChange={onChange} />
            </div>
            <div>
              <label className="label">Team 2 *</label>
              <input name="team2" className="input" value={form.team2} onChange={onChange} />
            </div>
            <div>
              <label className="label">Total Overs</label>
              <input name="totalOvers" type="number" min={1} max={50} className="input" value={form.totalOvers} onChange={onChange} />
            </div>
          </div>
        )}

        {sport === 'badminton' && (
          <div className="row">
            <div>
              <label className="label">Player 1 *</label>
              <input name="player1" className="input" value={form.player1} onChange={onChange} />
            </div>
            <div>
              <label className="label">Player 2 *</label>
              <input name="player2" className="input" value={form.player2} onChange={onChange} />
            </div>
            <div>
              <label className="label">Best of Sets</label>
              <select name="maxSets" className="select" value={form.maxSets} onChange={onChange}>
                <option value={3}>Best of 3</option>
                <option value={5}>Best of 5</option>
              </select>
            </div>
            <div>
              <label className="label">Points to Win</label>
              <input name="pointsToWin" type="number" min={1} className="input" value={form.pointsToWin} onChange={onChange} />
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={onCancel}>Back</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create & Go Live'}</button>
        </div>
      </form>
    </div>
  );
};

export default BookingMatchSetup;
