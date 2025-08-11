import React, { useState } from 'react';
import type { Match } from '../types';
import { matchAPI } from '../services/api';
import UmpireSelection from './UmpireSelection';

interface MatchSetupProps {
  onMatchCreated: (match: Match) => void;
}

const MatchSetup: React.FC<MatchSetupProps> = ({ onMatchCreated }) => {
  const [formData, setFormData] = useState({
    matchName: '',
    sportType: '',
    umpireId: '',
    team1: '',
    team2: '',
    totalOvers: 20,
    player1: '',
    player2: '',
    maxSets: 3,
    pointsToWin: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.matchName || !formData.sportType || !formData.umpireId) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.sportType === 'cricket' && (!formData.team1 || !formData.team2)) {
      setError('Please enter both team names for cricket match');
      return;
    }

    if (formData.sportType === 'badminton' && (!formData.player1 || !formData.player2)) {
      setError('Please enter both player names for badminton match');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const matchData = {
        matchName: formData.matchName,
        sportType: formData.sportType,
        umpireId: formData.umpireId,
        ...(formData.sportType === 'cricket' && {
          team1: formData.team1,
          team2: formData.team2,
          totalOvers: parseInt(formData.totalOvers.toString())
        }),
        ...(formData.sportType === 'badminton' && {
          player1: formData.player1,
          player2: formData.player2,
          maxSets: parseInt(formData.maxSets.toString()),
          pointsToWin: parseInt(formData.pointsToWin.toString())
        })
      };

      const response = await matchAPI.create(matchData);
      onMatchCreated(response.data);
      
      // Reset form
      setFormData({
        matchName: '',
        sportType: '',
        umpireId: '',
        team1: '',
        team2: '',
        totalOvers: 20,
        player1: '',
        player2: '',
        maxSets: 3,
        pointsToWin: 10
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create match');
      console.error('Error creating match:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create New Match</h2>
      {error && (
        <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Match Name */}
        <div>
          <label className="label">Match Name *</label>
          <input
            type="text"
            name="matchName"
            value={formData.matchName}
            onChange={handleInputChange}
            className="input"
            placeholder="Enter match name"
            required
          />
        </div>

        {/* Sport Type */}
        <div>
          <label className="label">Sport Type *</label>
          <select
            name="sportType"
            value={formData.sportType}
            onChange={handleInputChange}
            className="select"
            required
          >
            <option value="">Select sport type</option>
            <option value="cricket">Cricket</option>
            <option value="badminton">Badminton</option>
          </select>
        </div>

        {/* Umpire Selection */}
        <UmpireSelection
          selectedUmpire={formData.umpireId}
          onUmpireSelect={(umpireId) => setFormData(prev => ({ ...prev, umpireId }))}
          sportType={formData.sportType}
        />

        {/* Cricket-specific fields */}
        {formData.sportType === 'cricket' && (
          <>
            <div className="row">
              <div>
                <label className="label">Team 1 *</label>
                <input
                  type="text"
                  name="team1"
                  value={formData.team1}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter team 1 name"
                  required
                />
              </div>
              <div>
                <label className="label">Team 2 *</label>
                <input
                  type="text"
                  name="team2"
                  value={formData.team2}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter team 2 name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Total Overs</label>
              <input
                type="number"
                name="totalOvers"
                value={formData.totalOvers}
                onChange={handleInputChange}
                min="1"
                max="50"
                className="input"
              />
            </div>
          </>
        )}

        {/* Badminton-specific fields */}
        {formData.sportType === 'badminton' && (
          <>
            <div className="row">
              <div>
                <label className="label">Player 1 *</label>
                <input
                  type="text"
                  name="player1"
                  value={formData.player1}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter player 1 name"
                  required
                />
              </div>
              <div>
                <label className="label">Player 2 *</label>
                <input
                  type="text"
                  name="player2"
                  value={formData.player2}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter player 2 name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Best of Sets</label>
              <select
                name="maxSets"
                value={formData.maxSets}
                onChange={handleInputChange}
                className="select"
              >
                <option value={3}>Best of 3</option>
                <option value={5}>Best of 5</option>
              </select>
            </div>
            <div>
              <label className="label">Points to Win (per set)</label>
              <input
                type="number"
                name="pointsToWin"
                value={formData.pointsToWin}
                onChange={handleInputChange}
                min={1}
                className="input"
              />
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: 10 }}>
          {loading ? 'Creating Match...' : 'Create Match'}
        </button>
      </form>
    </div>
  );
};

export default MatchSetup;
