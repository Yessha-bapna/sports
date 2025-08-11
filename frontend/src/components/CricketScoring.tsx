import React, { useState } from 'react';
import type { Match, Score } from '../types';
import { scoreAPI } from '../services/api';
import socketService from '../services/socket';

interface CricketScoringProps {
  match: Match;
  score: Score | null;
  onScoreUpdate: (score: Score) => void;
}

const CricketScoring: React.FC<CricketScoringProps> = ({ match, score, onScoreUpdate }) => {
  const [runs, setRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [isExtra, setIsExtra] = useState(false);
  const [loading, setLoading] = useState(false);

  const cricketScore = score?.cricketScore;
  const currentTeam = cricketScore?.currentInnings || 1;

  const addRuns = async (runsToAdd: number) => {
    if (!match._id || loading) return;

    try {
      setLoading(true);
      const response = await scoreAPI.addCricketRuns(match._id, {
        runs: runsToAdd,
        isWicket,
        isExtra,
        team: currentTeam
      });
      
      onScoreUpdate(response.data);
      
      // Emit to socket for real-time updates
      socketService.updateScore(match._id, response.data);
      
      // Reset form
      setRuns(0);
      setIsWicket(false);
      setIsExtra(false);
    } catch (error) {
      console.error('Error adding runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchInnings = async () => {
    if (!match._id || !cricketScore) return;

    try {
      setLoading(true);
      const updatedScore = {
        cricketScore: {
          ...cricketScore,
          currentInnings: cricketScore.currentInnings === 1 ? 2 : 1,
          isInningsComplete: cricketScore.currentInnings === 1
        }
      };

      const response = await scoreAPI.updateCricketScore(match._id, updatedScore);
      onScoreUpdate(response.data);
      socketService.updateScore(match._id, response.data);
    } catch (error) {
      console.error('Error switching innings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatOvers = (overs: number, balls: number) => {
    return `${overs}.${balls}`;
  };

  if (!cricketScore) {
    return <div>Loading cricket score...</div>;
  }

  const team1Name = match.team1 || 'Team 1';
  const team2Name = match.team2 || 'Team 2';
  const currentTeamName = currentTeam === 1 ? team1Name : team2Name;

  return (
    <div>
      <h2>Cricket Scoring</h2>
      
      {/* Current Score Display */}
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="card" style={{ borderColor: currentTeam === 1 ? 'var(--primary)' : 'var(--border)' }}>
          <h3 style={{ marginTop: 0 }}>{team1Name}</h3>
          <div className="score">
            {cricketScore.team1Runs}/{cricketScore.team1Wickets}
          </div>
          <div className="help">
            Overs: {formatOvers(cricketScore.team1Overs, cricketScore.team1Balls)}
          </div>
        </div>
        
        <div className="card" style={{ borderColor: currentTeam === 2 ? 'var(--primary)' : 'var(--border)' }}>
          <h3 style={{ marginTop: 0 }}>{team2Name}</h3>
          <div className="score">
            {cricketScore.team2Runs}/{cricketScore.team2Wickets}
          </div>
          <div className="help">
            Overs: {formatOvers(cricketScore.team2Overs, cricketScore.team2Balls)}
          </div>
        </div>
      </div>

      {/* Current Batting Team */}
      <div className="card" style={{ background: '#fffbe6', borderColor: '#fde68a' }}>
        <h4 style={{ margin: 0 }}>
          Current Batting: {currentTeamName} (Innings {currentTeam})
        </h4>
      </div>

      {/* Quick Run Buttons */}
      <div>
        <h4 style={{ marginBottom: 10 }}>Quick Runs</h4>
        <div className="grid-4" style={{ marginBottom: 12 }}>
          {[0, 1, 2, 3, 4, 6].map((runValue) => (
            <button
              key={runValue}
              onClick={() => addRuns(runValue)}
              disabled={loading}
              className="btn btn-success"
            >
              {runValue}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Run Input */}
      <div className="card">
        <h4 style={{ marginBottom: 10 }}>Custom Entry</h4>
        <div className="row" style={{ marginBottom: 12 }}>
          <div>
            <label className="label">Runs</label>
            <input
              type="number"
              value={runs}
              onChange={(e) => setRuns(parseInt(e.target.value) || 0)}
              min="0"
              className="input"
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={isWicket}
                onChange={(e) => setIsWicket(e.target.checked)}
              />
              Wicket
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={isExtra}
                onChange={(e) => setIsExtra(e.target.checked)}
              />
              Extra (No ball/Wide)
            </label>
          </div>
        </div>
        <button
          onClick={() => addRuns(runs)}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {loading ? 'Adding...' : 'Add Runs'}
        </button>
      </div>

      {/* Innings Control */}
      <div>
        <button
          onClick={switchInnings}
          disabled={loading || cricketScore.currentInnings === 2}
          className="btn btn-warning"
          style={{ width: '100%' }}
        >
          {cricketScore.currentInnings === 1 ? 'End First Innings' : 'Second Innings Active'}
        </button>
      </div>

      {/* Match Info */}
      <div className="help">
        <p>Total Overs: {match.totalOvers}</p>
        <p>Last Updated: {score?.lastUpdated ? new Date(score.lastUpdated).toLocaleTimeString() : 'Never'}</p>
      </div>
    </div>
  );
};

export default CricketScoring;
