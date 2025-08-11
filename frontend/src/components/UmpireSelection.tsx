import React, { useState, useEffect } from 'react';
import type { Umpire } from '../types';
import { umpireAPI } from '../services/api';

interface UmpireSelectionProps {
  selectedUmpire: string;
  onUmpireSelect: (umpireId: string) => void;
  sportType?: string;
}

const UmpireSelection: React.FC<UmpireSelectionProps> = ({
  selectedUmpire,
  onUmpireSelect,
  sportType
}) => {
  const [umpires, setUmpires] = useState<Umpire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    experience: 0,
    specialization: [] as string[],
  });

  useEffect(() => {
    fetchUmpires();
  }, []);

  const fetchUmpires = async () => {
    try {
      setLoading(true);
      const response = await umpireAPI.getAll();
      let filteredUmpires = response.data;
      
      // Filter by sport type if specified
      if (sportType) {
        filteredUmpires = response.data.filter((umpire: Umpire) =>
          umpire.specialization.includes(sportType)
        );
      }
      
      setUmpires(filteredUmpires);
      setError(null);
    } catch (err) {
      setError('Failed to fetch umpires');
      console.error('Error fetching umpires:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <label className="label">Select Umpire</label>
        <div className="help">Loading umpires...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <label className="label">Select Umpire</label>
        <div className="alert error" style={{ marginBottom: 8 }}>{error}</div>
        <button onClick={fetchUmpires} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <label className="label">Select Umpire *</label>
      <select
        value={selectedUmpire}
        onChange={(e) => onUmpireSelect(e.target.value)}
        className="select"
        required
      >
        <option value="">Choose an umpire...</option>
        {umpires.map((umpire) => (
          <option key={umpire._id} value={umpire._id}>
            {umpire.name} ({umpire.experience} years) - {umpire.specialization.join(', ')}
          </option>
        ))}
      </select>
      {umpires.length === 0 && (
        <p className="help" style={{ marginTop: 6 }}>
          No umpires available{sportType ? ` for ${sportType}` : ''}
        </p>
      )}

      {/* Add Umpire Toggle */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(v => !v)}>
          {showAdd ? 'Cancel' : 'Add New Umpire'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Add Umpire</h3>

          {createError && <div className="alert error" style={{ marginBottom: 10 }}>{createError}</div>}

          <div className="row" style={{ marginBottom: 10 }}>
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Umpire name"
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="row" style={{ marginBottom: 10 }}>
            <div>
              <label className="label">Experience (years) *</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Specialization *</label>
              <div className="toolbar">
                {['cricket', 'badminton'].map(sp => (
                  <button
                    key={sp}
                    type="button"
                    className={`btn ${form.specialization.includes(sp) ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => {
                      setForm(f => {
                        const exists = f.specialization.includes(sp);
                        return { ...f, specialization: exists ? f.specialization.filter(s => s !== sp) : [...f.specialization, sp] };
                      });
                    }}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={creating}
              onClick={async () => {
                try {
                  setCreating(true);
                  setCreateError(null);
                  if (!form.name || !form.email || !form.specialization.length) {
                    setCreateError('Please fill all required fields');
                    return;
                  }
                  const payload = { ...form, isActive: true };
                  const res = await umpireAPI.create(payload);
                  // Refresh and select new
                  await fetchUmpires();
                  onUmpireSelect(res.data._id);
                  setShowAdd(false);
                  setForm({ name: '', email: '', experience: 0, specialization: [] });
                } catch (e: any) {
                  setCreateError(e?.response?.data?.error || 'Failed to create umpire');
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? 'Adding...' : 'Add Umpire'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UmpireSelection;
