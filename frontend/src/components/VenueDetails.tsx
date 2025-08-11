import React, { useEffect, useState } from 'react';
import type { Venue, Booking, Match } from '../types';
import { venueAPI, bookingAPI } from '../services/api';
import socketService from '../services/socket';
import BookingForm from './BookingForm';

interface VenueDetailsProps {
  venueId: string;
  onBack?: () => void;
  onSetupMatch?: (booking: Booking, venue: Venue) => void;
  onOpenMatch?: (match: Match, tab: 'add' | 'view') => void;
}

const amenityIcons: Record<string, string> = {
  Parking: '🅿️',
  Restroom: '🚻',
  Refreshments: '🥤',
  'CCTV Surveillance': '📹',
  WiFi: '📶',
  Library: '📚',
  'Air Conditioned': '❄️',
  'Seating Arrangement': '🪑',
};

const VenueDetails: React.FC<VenueDetailsProps> = ({ venueId, onBack, onSetupMatch, onOpenMatch }) => {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const resultsByMatch = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of results) {
      const mid = typeof r.matchId === 'string' ? r.matchId : r.matchId?._id;
      if (mid) map[mid] = r;
    }
    return map;
  }, [results]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [matchesByBooking, setMatchesByBooking] = useState<Record<string, Match>>({});

  const loadVenueMatches = async () => {
    if (!venue?._id) return;
    try {
      setLoadingResults(true);
      const { matchAPI, scoreAPI } = await import('../services/api');
      const all = await matchAPI.getAll();
      const venueIdStr = typeof venue._id === 'string' ? venue._id : (venue._id as any)?.toString?.();
      const venueMatches: Match[] = (all.data || []).filter((m: any) => {
        const mv = typeof m.venueId === 'string' ? m.venueId : m.venueId?.toString?.();
        return mv === venueIdStr;
      });
      // map by bookingId for booked slots actions
      const map: Record<string, Match> = {};
      venueMatches.forEach((m: any) => { if (m.bookingId) map[m.bookingId] = m; });
      setMatchesByBooking(map);
      // build results from completed ones
      const completed = venueMatches.filter((m: any) => m.status === 'completed');
      const enriched: any[] = [];
      for (const m of completed) {
        try {
          const sres = await scoreAPI.getByMatchId(m._id);
          const rawWinner = sres.data?.winner;
          let winnerLabel = rawWinner || '-';
          if (rawWinner === 'player1') {
            winnerLabel = m.player1 || m.team1 || 'Player 1';
          } else if (rawWinner === 'player2') {
            winnerLabel = m.player2 || m.team2 || 'Player 2';
          }
          enriched.push({ ...m, winner: winnerLabel });
        } catch {
          enriched.push({ ...m, winner: '-' });
        }
      }
      setResults(enriched);
    } catch (e) {
      setMatchesByBooking({});
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await venueAPI.getById(venueId);
        setVenue(res.data);
        setForm({
          name: res.data.name || '',
          city: res.data.city || '',
          address: res.data.address || '',
          sports: res.data.sports || [],
          type: res.data.type || 'mixed',
          imageUrl: res.data.imageUrl || '',
          openingTime: res.data.openingTime || '',
          closingTime: res.data.closingTime || '',
          amenities: res.data.amenities || [],
          about: res.data.about || '',
          mapUrl: res.data.mapUrl || '',
          rating: typeof res.data.rating === 'number' ? String(res.data.rating) : '',
          galleryInput: Array.isArray(res.data.gallery) ? res.data.gallery.join('\n') : ''
        });
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load venue');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [venueId]);

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      // fetch bookings from today onwards
      const start = new Date();
      // normalize to start of day to avoid time boundary misses
      start.setHours(0, 0, 0, 0);
      const res = await bookingAPI.getByVenue(venueId, { start: start.toISOString() });
      setBookings(res.data);
    } catch (e) {
      // ignore silently, details page still usable
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadBookings();
    loadVenueMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  // Listen for live score updates and refresh results if an associated match completes
  useEffect(() => {
    const handler = (data: any) => {
      try {
        const m = data?.matchId; // populated match from backend
        const mVenueId = m && (typeof m.venueId === 'string' ? m.venueId : m.venueId?.toString?.());
        if (m && mVenueId === venueId && (data?.isMatchComplete || typeof data?.winner !== 'undefined')) {
          loadVenueMatches();
        }
      } catch {}
    };
    socketService.onScoreUpdate(handler);
    return () => {
      socketService.offScoreUpdate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const toggleArrayValue = (key: 'sports' | 'amenities', val: string) => {
    setForm((prev: any) => {
      const arr: string[] = prev[key] || [];
      const exists = arr.includes(val);
      return { ...prev, [key]: exists ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const save = async () => {
    setError(null);
    setSuccess(null);
    if (!form?.name || !form?.city) {
      setError('Name and City are required');
      return;
    }
    if (!form?.sports || form.sports.length === 0) {
      setError('Select at least one sport');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address?.trim() || undefined,
        sports: form.sports,
        type: form.type,
        imageUrl: form.imageUrl?.trim() || undefined,
        openingTime: form.openingTime?.trim() || undefined,
        closingTime: form.closingTime?.trim() || undefined,
        amenities: form.amenities,
        about: form.about?.trim() || undefined,
        mapUrl: form.mapUrl?.trim() || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
        gallery: form.galleryInput
          ? form.galleryInput.split(/\r?\n|,\s*/).map((s: string) => s.trim()).filter(Boolean)
          : [],
      };
      const res = await venueAPI.update(venueId, payload);
      setVenue(res.data);
      setSuccess('Venue updated successfully');
      setEdit(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update venue');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="card">Loading venue...</div>;
  if (error) return <div className="alert error">{error}</div>;
  if (!venue) return null;

  return (
    <div>
      {error && <div className="alert error" style={{ marginBottom: 10 }}>{error}</div>}
      {success && <div className="alert success" style={{ marginBottom: 10 }}>{success}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          {!edit ? (
            <>
              <h2 style={{ margin: 0 }}>{venue.name}</h2>
              <p className="help" style={{ marginTop: 4 }}>📍 {venue.city}{venue.address ? `, ${venue.address}` : ''} {venue.rating ? ` · ⭐ ${venue.rating.toFixed(1)}` : ''}</p>
            </>
          ) : (
            <div className="row">
              <input className="input" name="name" value={form?.name || ''} onChange={handleChange} placeholder="Venue name" />
              <input className="input" name="city" value={form?.city || ''} onChange={handleChange} placeholder="City" />
              <input className="input" name="address" value={form?.address || ''} onChange={handleChange} placeholder="Address" />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!edit && <button className="btn btn-success" onClick={() => setShowBooking(true)}>Book This Venue</button>}
          {!edit && <button className="btn" onClick={() => setEdit(true)}>Edit</button>}
          {edit && (
            <>
              <button className="btn btn-primary" onClick={save} disabled={loading}>Save</button>
              <button className="btn" onClick={() => { setEdit(false); setError(null); setSuccess(null); setForm({ ...form, ...{
                name: venue.name || '', city: venue.city || '', address: venue.address || '', sports: venue.sports || [], type: venue.type || 'mixed', imageUrl: venue.imageUrl || '', openingTime: venue.openingTime || '', closingTime: venue.closingTime || '', amenities: venue.amenities || [], about: venue.about || '', mapUrl: venue.mapUrl || '', rating: typeof venue.rating === 'number' ? String(venue.rating) : '', galleryInput: Array.isArray(venue.gallery) ? venue.gallery.join('\n') : ''
              }}); }}>Cancel</button>
            </>
          )}
          {onBack && <button className="btn" onClick={onBack}>Back</button>}
        </div>
      </div>

      <div className="row">
        <div style={{ flex: 3 }}>
          <div className="card" style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!edit && venue.gallery && venue.gallery.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={venue.gallery[0]} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
            ) : !edit && venue.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={venue.imageUrl} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
            ) : !edit ? (
              <div style={{ color: '#888' }}>Images / Videos</div>
            ) : (
              <div style={{ width: '100%' }}>
                <div className="row">
                  <input className="input" name="imageUrl" value={form?.imageUrl || ''} onChange={handleChange} placeholder="Main Image URL" />
                </div>
                <div>
                  <label className="label">Gallery URLs (comma or newline separated)</label>
                  <textarea className="input" name="galleryInput" style={{ minHeight: 80 }} value={form?.galleryInput || ''} onChange={handleChange} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Operating Hours</div>
            {!edit ? (
              <div className="badge">
                {venue.openingTime || '07:00 AM'} - {venue.closingTime || '11:00 PM'}
              </div>
            ) : (
              <div className="row">
                <input className="input" name="openingTime" value={form?.openingTime || ''} onChange={handleChange} placeholder="07:00 AM" />
                <input className="input" name="closingTime" value={form?.closingTime || ''} onChange={handleChange} placeholder="11:00 PM" />
                <input className="input" name="rating" type="number" min={0} max={5} step={0.1} value={form?.rating || ''} onChange={handleChange} placeholder="Rating 0-5" />
              </div>
            )}
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Address</div>
            {!edit ? (
              <div className="help">{venue.address || '—'}</div>
            ) : (
              <input className="input" name="address" value={form?.address || ''} onChange={handleChange} placeholder="Address" />
            )}
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Location Map</div>
            {!edit ? (
              venue.mapUrl ? <a href={venue.mapUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">Open Map</a> : <div className="help">—</div>
            ) : (
              <input className="input" name="mapUrl" value={form?.mapUrl || ''} onChange={handleChange} placeholder="https://maps.google.com/..." />
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Sports Available</div>
        {!edit ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {venue.sports?.map(s => (
              <div key={s} className="card" style={{ padding: 8 }}>
                {s}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['cricket','badminton','football','basketball','tennis','other'].map(s => (
              <label key={s} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={form?.sports?.includes(s)} onChange={() => toggleArrayValue('sports', s)} /> {s}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Amenities</div>
        {!edit ? (
          venue.amenities && venue.amenities.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {venue.amenities.map(a => (
                <div key={a} className="help">{amenityIcons[a] || '•'} {a}</div>
              ))}
            </div>
          ) : <div className="help">—</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Parking','Restroom','Refreshments','CCTV Surveillance','WiFi','Library','Air Conditioned','Seating Arrangement'].map(a => (
              <label key={a} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={form?.amenities?.includes(a)} onChange={() => toggleArrayValue('amenities', a)} /> {a}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>About Venue</div>
        {!edit ? (
          <div className="help">{venue.about || '—'}</div>
        ) : (
          <textarea className="input" name="about" style={{ minHeight: 80 }} value={form?.about || ''} onChange={handleChange} />
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Player Reviews & Ratings</div>
        <div className="help">Coming soon</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Booked Slots</div>
        {loadingBookings ? (
          <div className="help">Loading slots...</div>
        ) : bookings.length === 0 ? (
          <div className="help">No bookings yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {bookings.map(b => {
              const start = new Date(b.startAt);
              const end = new Date(b.endAt);
              return (
                <div key={b._id} className="card" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{start.toLocaleDateString()} · {start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} — {end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="help" style={{ marginTop: 4 }}>Sport: {b.sport} {b.court ? `· ${b.court}` : ''}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    {matchesByBooking[b._id] ? (
                      (() => {
                        const m = matchesByBooking[b._id];
                        if (m.status === 'completed') {
                          const res = resultsByMatch[m._id];
                          const label = res?.winner ? `Result: ${res.winner}` : 'View Result';
                          return (
                            onOpenMatch && (
                              <button className="btn" style={{ background:'#28a745', color:'#fff' }} onClick={() => onOpenMatch(m, 'view')}>{label}</button>
                            )
                          );
                        }
                        return (
                          onOpenMatch && (
                            <>
                              <button className="btn btn-primary" onClick={() => onOpenMatch(m, 'add')}>Add Score</button>
                              <button className="btn" onClick={() => onOpenMatch(m, 'view')}>View Score</button>
                            </>
                          )
                        );
                      })()
                    ) : (
                      onSetupMatch && <button className="btn btn-primary" onClick={() => onSetupMatch(b, venue)}>Setup Match</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Results at this Venue</div>
        {loadingResults ? (
          <div className="help">Loading results...</div>
        ) : results.length === 0 ? (
          <div className="help">No completed matches yet.</div>
        ) : (
          <ul className="list">
            {results.map((m: any) => (
              <li key={m._id} className="list-item">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.matchName}</div>
                    <div className="help">{m.sportType} · Winner: {m.winner || '-'}</div>
                  </div>
                  <span className="badge done">completed</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showBooking && venue && (
        <BookingForm
          venueId={venue._id}
          sports={venue.sports || []}
          openingTime={venue.openingTime}
          closingTime={venue.closingTime}
          pricePerHour={venue.pricePerHour}
          onClose={() => setShowBooking(false)}
          onSaved={() => { setShowBooking(false); loadBookings(); setSuccess('Booking created'); }}
        />
      )}
    </div>
  );
};

export default VenueDetails;
