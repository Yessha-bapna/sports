import React, { useState } from 'react';
import type { Match, Score } from '../types';
import { scoreAPI } from '../services/api';
import socketService from '../services/socket';

interface BadmintonScoringProps {
  match: Match;
  score: Score | null;
  onScoreUpdate: (score: Score) => void;
}

const BadmintonScoring: React.FC<BadmintonScoringProps> = ({ match, score, onScoreUpdate }) => {
  const [loading, setLoading] = useState(false);

  const badmintonScore = score?.badmintonScore;

  const addPoint = async (player: 'player1' | 'player2') => {
    if (!match._id || loading || score?.isMatchComplete) return;

    try {
      setLoading(true);
      const response = await scoreAPI.addBadmintonPoint(match._id, { player });
      onScoreUpdate(response.data);
      socketService.updateScore(match._id, response.data);
    } catch (error) {
      console.error(`Error adding point for ${player}:`, error);
    } finally {
      setLoading(false);
    }
  };

  if (!badmintonScore) {
    return <div>Loading badminton score...</div>;
  }

  const player1Name = match.player1 || 'Player 1';
  const player2Name = match.player2 || 'Player 2';

  return (
    <div>
      <h2>Badminton Scoring</h2>

      {/* Score Display */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {/* Player 1 Score */}
        <div style={{ textAlign: 'center' }}>
          <h3>{player1Name}</h3>
          <p className="score"><span className="num">{badmintonScore.player1Sets}</span></p>
          <p className="help">Sets Won</p>
        </div>

        <div className="text-2xl font-bold text-gray-400">VS</div>

        {/* Player 2 Score */}
        <div style={{ textAlign: 'center' }}>
          <h3>{player2Name}</h3>
          <p className="score"><span className="num">{badmintonScore.player2Sets}</span></p>
          <p className="help">Sets Won</p>
        </div>
      </div>

      {/* Current Set Details */}
      <div>
        <h4 style={{ marginBottom: 10, textAlign: 'center' }}>Current Set: {badmintonScore.currentSet}</h4>
        {badmintonScore.sets.map((set, index) => (
          <div key={index} className="card" style={{ background: set.setNumber === badmintonScore.currentSet ? '#fffbe6' : undefined, borderColor: set.setNumber === badmintonScore.currentSet ? '#fde68a' : undefined, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>Set {set.setNumber}</div>
              <div className="score">
                <div className="num">{set.player1Score}</div>
                <div className="help">-</div>
                <div className="num">{set.player2Score}</div>
              </div>
              {set.isComplete && (
                <div className="badge done">Winner: {set.winner === 'player1' ? player1Name : player2Name}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Scoring Controls */}
      {!score.isMatchComplete ? (
        <div className="grid-2">
          <button
            onClick={() => addPoint('player1')}
            disabled={loading}
            className="btn btn-primary"
          >
            Point for {player1Name}
          </button>
          <button
            onClick={() => addPoint('player2')}
            disabled={loading}
            className="btn btn-danger"
          >
            Point for {player2Name}
          </button>
        </div>
      ) : (
        <div className="alert success" style={{ textAlign: 'center' }}>
          <h3>Match Complete!</h3>
          <p>Winner: {score.winner === 'player1' ? player1Name : player2Name}</p>
        </div>
      )}

      {/* Match Info */}
      <div className="help" style={{ marginTop: 12 }}>
        <p>Best of {match.maxSets} sets</p>
        <p>Last Updated: {score?.lastUpdated ? new Date(score.lastUpdated).toLocaleTimeString() : 'Never'}</p>
      </div>
    </div>
  );
};

export default BadmintonScoring;
