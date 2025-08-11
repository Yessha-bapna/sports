import React, { useState } from 'react';
import { venueAPI } from '../services/api';

const sportsOptions = ['cricket', 'badminton', 'football', 'basketball', 'tennis', 'other'];
const typeOptions = ['indoor', 'outdoor', 'mixed'];

const VenueAdd: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    sports: [] as string[],
    type: 'mixed',
    imageUrl: '',
    openingTime: '',
    closingTime: '',
    amenities: [] as string[],
    about: '',
    mapUrl: '',
    rating: '' as any,
    pricePerHour: '' as any,
    galleryInput: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleSport = (sport: string) => {
    setForm(prev => {
      const exists = prev.sports.includes(sport);
      return { ...prev, sports: exists ? prev.sports.filter(s => s !== sport) : [...prev.sports, sport] };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name || !form.city) {
      setError('Please fill required fields: name and city');
      return;
    }

    if (!form.sports || form.sports.length === 0) {
      setError('Please select at least one sport');
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
        pricePerHour: form.pricePerHour ? Number(form.pricePerHour) : undefined,
        gallery: form.galleryInput
          ? form.galleryInput.split(/\r?\n|,\s*/).map(s => s.trim()).filter(Boolean)
          : undefined,
      };
      await venueAPI.create(payload);
      setSuccess('Venue created successfully');
      setForm({
        name: '', city: '', address: '', sports: [], type: 'mixed', imageUrl: '',
        openingTime: '', closingTime: '', amenities: [], about: '', mapUrl: '', rating: '', pricePerHour: '', galleryInput: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add Venue</h2>
      {error && <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>}
      {success && <div className="alert success" style={{ marginBottom: 12 }}>{success}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="row">
          <div>
            <label className="label">Name *</label>
            <input name="name" className="input" value={form.name} onChange={handleChange} placeholder="Venue name" />
          </div>
          <div>
            <label className="label">City *</label>
            <input name="city" className="input" value={form.city} onChange={handleChange} placeholder="City" />
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <input name="address" className="input" value={form.address} onChange={handleChange} placeholder="Street, area" />
        </div>

        <div className="row">
          <div>
            <label className="label">Type</label>
            <select name="type" className="select" value={form.type} onChange={handleChange}>
              {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Image URL</label>
            <input name="imageUrl" className="input" value={form.imageUrl} onChange={handleChange} placeholder="https://..." />
          </div>
        </div>

        <div className="row">
          <div>
            <label className="label">Opening Time</label>
            <input name="openingTime" className="input" value={form.openingTime} onChange={handleChange} placeholder="07:00 AM" />
          </div>
          <div>
            <label className="label">Closing Time</label>
            <input name="closingTime" className="input" value={form.closingTime} onChange={handleChange} placeholder="11:00 PM" />
          </div>
          <div>
            <label className="label">Rating (0-5)</label>
            <input name="rating" type="number" min={0} max={5} step={0.1} className="input" value={form.rating} onChange={handleChange} placeholder="4.5" />
          </div>
          <div>
            <label className="label">Price Per Hour (₹)</label>
            <input name="pricePerHour" type="number" min={0} step={1} className="input" value={form.pricePerHour} onChange={handleChange} placeholder="1200" />
          </div>
        </div>

        <div>
          <label className="label">Sports</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {sportsOptions.map(s => (
              <label key={s} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={form.sports.includes(s)} onChange={() => toggleSport(s)} /> {s}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Amenities</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Parking','Restroom','Refreshments','CCTV Surveillance','WiFi','Library','Air Conditioned','Seating Arrangement'].map(a => (
              <label key={a} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={form.amenities.includes(a)}
                  onChange={() => setForm(prev => ({
                    ...prev,
                    amenities: prev.amenities.includes(a)
                      ? prev.amenities.filter(x => x !== a)
                      : [...prev.amenities, a]
                  }))}
                /> {a}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">About</label>
          <textarea name="about" className="input" style={{ minHeight: 80 }} value={form.about} onChange={handleChange} placeholder="Describe the venue, rules, fees, equipment..." />
        </div>

        <div className="row">
          <div>
            <label className="label">Map URL</label>
            <input name="mapUrl" className="input" value={form.mapUrl} onChange={handleChange} placeholder="https://maps.google.com/..." />
          </div>
          <div>
            <label className="label">Gallery URLs (comma or newline separated)</label>
            <textarea name="galleryInput" className="input" style={{ minHeight: 80 }} value={form.galleryInput} onChange={handleChange} placeholder="https://img1,... or line per URL" />
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Venue'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VenueAdd;
