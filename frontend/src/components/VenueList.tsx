import React, { useEffect, useMemo, useState } from 'react';
import type { Venue } from '../types';
import { venueAPI } from '../services/api';

interface VenueListProps {
  onViewDetails?: (venueId: string) => void;
}

const sportsOptions = ['cricket', 'badminton', 'football', 'basketball', 'tennis', 'other'];
const typeOptions = ['indoor', 'outdoor', 'mixed'];

const PAGE_SIZE = 12;

const VenueList: React.FC<VenueListProps> = ({ onViewDetails }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (q) params.q = q;
      if (city) params.city = city;
      if (sport) params.sport = sport;
      if (type) params.type = type;
      const res = await venueAPI.getAll(params);
      setVenues(res.data);
      setError(null);
      setPage(1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-fetch when filters change
  useEffect(() => {
    const id = setTimeout(() => {
      fetchVenues();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, sport, type]);

  const filtered = useMemo(() => venues, [venues]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h2>Sports Venues</h2>
      <div className="layout" style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:12, alignItems:'start' }}>
        {/* Left: Filters aligned to left */}
        <div className="left-col">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Filters</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <input className="input" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
              <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              <select className="select" value={sport} onChange={(e) => setSport(e.target.value)}>
                <option value="">All Sports</option>
                {sportsOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All Types</option>
                {typeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={fetchVenues}>Apply Filters</button>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="right-col" style={{ minHeight: 200 }}>
          {loading && <div className="card">Loading venues...</div>}
          {error && <div className="alert error">{error}</div>}

          {!loading && !error && (
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {paged.map(v => (
                <div key={v._id} className="card">
                  <div style={{ height: 120, background: '#222', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
                    {v.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.imageUrl} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Image</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{v.name}</h3>
                    <span className="badge info" title={v.type}>{v.type}</span>
                  </div>
                  <p className="help" style={{ marginTop: 4 }}>{v.city}{v.address ? ` · ${v.address}` : ''}</p>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {v.sports?.map(s => (
                      <span key={s} className="badge">{s}</span>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginTop: 10 }}>
                    <button className="btn btn-secondary" onClick={() => onViewDetails && onViewDetails(v._id)}>View Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <button className="btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <div className="badge">{page} / {totalPages}</div>
              <button className="btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VenueList;
