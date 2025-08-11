import React, { useState, useEffect, useRef } from 'react';
import type { Match, Score } from '../types';
import { scoreAPI, matchAPI, bookingAPI } from '../services/api';
import socketService from '../services/socket';
import CricketScoring from './CricketScoring';
import BadmintonScoring from './BadmintonScoring';

interface LiveScoreProps {
  match: Match;
  onMatchComplete: (matchId: string) => void;
  initialTab?: 'add' | 'view';
}

const LiveScore: React.FC<LiveScoreProps> = ({ match, onMatchComplete, initialTab }) => {
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [endMs, setEndMs] = useState<number | null>(match.endTime ? new Date(match.endTime).getTime() : null);
  const [booking, setBooking] = useState<any | null>(null);
  const [tab, setTab] = useState<'add' | 'view'>(initialTab || 'add');
  const [localStatus, setLocalStatus] = useState<'upcoming' | 'live' | 'completed'>(match.status);
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState<string>('');
  const shownSecondInningsRef = useRef<string | null>(null); // matchId once shown
  const shownWinnerRef = useRef<string | null>(null); // matchId once shown
  const scoreRef = useRef<Score | null>(null);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  // Resolve countdown end time: use match.endTime; if missing, use booking.endAt
  useEffect(() => {
    let active = true;
    const resolveEnd = async () => {
      try {
        if (match.endTime) {
          if (!active) return;
          setEndMs(new Date(match.endTime).getTime());
          return;
        }
        if (match.bookingId) {
          const res = await bookingAPI.getById(match.bookingId);
          const bk = res.data;
          if (active) setBooking(bk);
          const endAt = bk?.endAt || bk?.endTime;
          if (endAt && active) { setEndMs(new Date(endAt).getTime()); return; }
        }
        // Fallback: derive from startTime and sport default duration
        const startTs = match.startTime ? new Date(match.startTime).getTime() : Date.now();
        const fallbackMinutes = match.sportType === 'cricket' ? 60 : 30;
        if (active) setEndMs(startTs + fallbackMinutes * 60 * 1000);
      } catch (e) {
        console.warn('Could not resolve booking end time', e);
      }
    };
    resolveEnd();
    return () => { active = false; };
  }, [match.endTime, match.bookingId, match._id]);

  useEffect(() => {
    // Fetch initial score
    const fetchScore = async () => {
      try {
        setLoading(true);
        const response = await scoreAPI.getByMatchId(match._id);
        setScore(response.data);
        scoreRef.current = response.data;
        setError(null);
      } catch (err) {
        setError('Failed to fetch score');
        console.error('Error fetching score:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();

    // Join this match room and listen for updates
    socketService.joinMatch(match._id);

    socketService.onScoreUpdate((updatedScore: any) => {
      const updatedMatchId = typeof updatedScore.matchId === 'string' ? updatedScore.matchId : updatedScore.matchId?._id;
      if (updatedMatchId === match._id) {
        // Detect transitions for popups
        const prev = scoreRef.current;
        const prevInnings = prev?.cricketScore?.currentInnings;
        const nextInnings = updatedScore?.cricketScore?.currentInnings;
        if (prevInnings === 1 && nextInnings === 2 && shownSecondInningsRef.current !== match._id) {
          setModalText('Second Innings Started');
          setShowModal(true);
          shownSecondInningsRef.current = match._id;
        }
        if (updatedScore?.isMatchComplete === true && shownWinnerRef.current !== match._id) {
          const w = updatedScore?.winner ? `Winner: ${updatedScore.winner}` : 'Match Completed';
          setModalText(w);
          setShowModal(true);
          shownWinnerRef.current = match._id;
          setLocalStatus('completed');
        }
        setScore(updatedScore);
        scoreRef.current = updatedScore;
        if (updatedScore.isMatchComplete === true) {
          onMatchComplete(match._id);
        }
      }
    });

    socketService.onError((err: any) => {
      console.error('Socket error:', err);
      setError('A connection error occurred.');
    });

    // Reset modal flags on match change
    shownSecondInningsRef.current = null;
    shownWinnerRef.current = null;
    // Cleanup on component unmount or match change
    return () => {
      socketService.offScoreUpdate();
      socketService.leaveMatch(match._id);
    };
  }, [match._id, onMatchComplete]);

  const handleScoreUpdate = (updatedScore: Score) => {
    setScore(updatedScore);
    scoreRef.current = updatedScore;
  };

  const handleSetMatchLive = async () => {
    try {
      const res = await matchAPI.updateStatus(match._id, 'live');
      const updated = res.data;
      setLocalStatus('live');
      setTab('add');
      if (updated?.endTime) {
        const ts = new Date(updated.endTime).getTime();
        setEndMs(ts);
      }
      // Ensure we have an end time source (match or booking) and prime countdown immediately
      let endTs = endMs;
      if (!endTs) {
        if (match.endTime) endTs = new Date(match.endTime).getTime();
        else if (match.bookingId) {
          try {
            const res = await bookingAPI.getById(match.bookingId);
            const bk = res.data;
            setBooking(bk);
            const endAt = bk?.endAt || bk?.endTime;
            if (endAt) {
              endTs = new Date(endAt).getTime();
              setEndMs(endTs);
            }
          } catch (e) {
            console.warn('Failed to fetch booking during start', e);
          }
        }
        // Fallback if still missing
        if (!endTs) {
          const startTs = match.startTime ? new Date(match.startTime).getTime() : Date.now();
          const fallbackMinutes = match.sportType === 'cricket' ? 60 : 30;
          endTs = startTs + fallbackMinutes * 60 * 1000;
          setEndMs(endTs);
        }
      }
      if (endTs) {
        const rem = endTs - Date.now();
        setRemainingMs(rem > 0 ? rem : 0);
      }
    } catch (error) {
      console.error('Failed to set match to live:', error);
    }
  };

  const finalizeAndStop = async () => {
    try {
      // Compute winner based on current score
      let winner: string | undefined = undefined;
      const s = score;
      if (s?.cricketScore) {
        const cs = s.cricketScore;
        if (cs.team1Runs !== cs.team2Runs) {
          winner = (cs.team1Runs > cs.team2Runs) ? (match.team1 || 'Team 1') : (match.team2 || 'Team 2');
        }
      } else if (s?.badmintonScore) {
        const bs = s.badmintonScore;
        if (bs.player1Sets !== bs.player2Sets) {
          winner = (bs.player1Sets > bs.player2Sets) ? (match.player1 || 'Player 1') : (match.player2 || 'Player 2');
        }
      }
      if (s) {
        const updated: any = { ...s, winner: winner || s.winner, isMatchComplete: true };
        if (s.cricketScore) {
          const res = await scoreAPI.updateCricketScore(match._id, updated);
          setScore(res.data);
        } else if (s.badmintonScore) {
          const res = await scoreAPI.updateBadmintonScore(match._id, updated);
          setScore(res.data);
        }
      }
      await matchAPI.updateStatus(match._id, 'completed');
      setLocalStatus('completed');
      onMatchComplete(match._id);
    } catch (e) {
      console.error('Failed to stop match', e);
    }
  };

  // Countdown timer until match.endTime (from booking)
  useEffect(() => {
    if (!endMs) { setRemainingMs(null); return; }
    const end = endMs;
    const tick = () => {
      const now = Date.now();
      const rem = end - now;
      setRemainingMs(rem > 0 ? rem : 0);
    };
    // initial tick immediately
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs, match._id]);

  const fmt = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts = [h, m, s].map(v => String(v).padStart(2, '0'));
    return parts.join(':');
  };

  if (loading) {
    return <div className="card">Loading score...</div>;
  }

  if (error) {
    return <div className="alert error">{error}</div>;
  }

  const ViewCricket = () => {
    const cs = score?.cricketScore;
    if (!cs) return <div className="help">No cricket score yet.</div>;
    return (
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <table className="table" style={{ width:'100%' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th>Runs</th>
                <th>Wickets</th>
                <th>Overs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{match.team1 || 'Team 1'}</td>
                <td>{cs.team1Runs}</td>
                <td>{cs.team1Wickets}</td>
                <td>{cs.team1Overs}</td>
              </tr>
              <tr>
                <td>{match.team2 || 'Team 2'}</td>
                <td>{cs.team2Runs}</td>
                <td>{cs.team2Wickets}</td>
                <td>{cs.team2Overs}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card" style={{ background:'#f8f9fb' }}>
          <div className="row" style={{ justifyContent:'space-between' }}>
            <div>Winner</div>
            <div style={{ fontWeight:600 }}>{score?.winner || '—'}</div>
          </div>
        </div>
      </div>
    );
  };

  const ViewBadminton = () => {
    const bs = score?.badmintonScore;
    if (!bs) return <div className="help">No badminton score yet.</div>;
    return (
      <div className="grid" style={{ gap: 12 }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>{match.player1 || 'Player 1'}</h4>
          <div className="row">
            <div className="pill">Sets: <b>{bs.player1Sets}</b></div>
          </div>
        </div>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>{match.player2 || 'Player 2'}</h4>
          <div className="row">
            <div className="pill">Sets: <b>{bs.player2Sets}</b></div>
          </div>
        </div>
        <div className="card" style={{ background:'#f8f9fb' }}>
          <div className="row" style={{ justifyContent:'space-between' }}>
            <div>Winner</div>
            <div style={{ fontWeight:600 }}>{score?.winner || '—'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{match.matchName}</h2>
          <p className="help">Umpire: {match.umpireId.name}</p>
        </div>
        <div className={`badge ${localStatus === 'live' ? 'live' : localStatus === 'completed' ? 'done' : 'info'}`}>
          {localStatus.toUpperCase()}
        </div>
      </div>

      {(match.endTime || booking?.startAt) && (
        <div className="card" style={{ marginBottom: 8, background: '#eef6ff' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="help">Scheduled: {new Date(booking?.startAt || match.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(booking?.endAt || match.endTime || booking?.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            {localStatus === 'live' && (typeof remainingMs === 'number') && (
              <div className="badge info">Time Left: {fmt(remainingMs)}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom: 8 }}>
        {localStatus === 'upcoming' && (
          <button className="btn btn-primary" onClick={handleSetMatchLive}>Start Match</button>
        )}
        {localStatus === 'live' && (
          <button className="btn" onClick={finalizeAndStop}>Stop Match</button>
        )}
      </div>
      

      {localStatus === 'live' && (
        <div style={{ textAlign: 'right', margin: '8px 0' }}>
          <button onClick={finalizeAndStop} className="btn btn-danger">Stop Match</button>
        </div>
      )}

      {localStatus !== 'upcoming' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <button className={`btn ${tab==='add' ? 'btn-primary' : ''}`} onClick={() => setTab('add')}>Add Score</button>
            <button className={`btn ${tab==='view' ? 'btn-primary' : ''}`} onClick={() => setTab('view')}>View Score</button>
          </div>

          {tab === 'add' && localStatus === 'live' && (
            <>
              {match.sportType === 'cricket' && (
                <CricketScoring match={match} score={score} onScoreUpdate={handleScoreUpdate} />
              )}
              {match.sportType === 'badminton' && (
                <BadmintonScoring match={match} score={score} onScoreUpdate={handleScoreUpdate} />
              )}
              {/* Winner summary below scoring */}
              <div className="card" style={{ marginTop: 8, background:'#f8f9fb' }}>
                <div className="row" style={{ justifyContent:'space-between' }}>
                  <div>Winner</div>
                  <div style={{ fontWeight:600 }}>{score?.winner || '—'}</div>
                </div>
              </div>
            </>
          )}

          {(tab === 'view' || remainingMs === 0 || localStatus === 'completed') && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Scoreboard</h3>
              {match.sportType === 'cricket' ? <ViewCricket /> : <ViewBadminton />}
            </div>
          )}
        </>
      )}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="card" style={{ maxWidth: 420, width:'90%', padding:16, background:'#fff' }}>
            <h3 style={{ marginTop:0 }}>Notification</h3>
            <p style={{ margin:'8px 0 16px' }}>{modalText}</p>
            <div style={{ textAlign:'right' }}>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScore;
