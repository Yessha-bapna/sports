import React, { useEffect, useMemo, useState } from 'react';
import { bookingAPI } from '../services/api';
import type { Booking } from '../types';

interface BookingFormProps {
  venueId: string;
  sports: string[];
  openingTime?: string; // e.g., '07:00 AM'
  closingTime?: string; // e.g., '11:00 PM'
  pricePerHour?: number; // ₹ per hour
  onClose: () => void;
  onSaved: () => void;
}

const minutesOptions = [30, 60, 90, 120];

function parse12hToMinutes(str?: string): number | null {
  if (!str) return null;
  const s = str.trim();
  // Try 24h HH:MM
  let m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let hh = parseInt(m24[1], 10);
    const mm = parseInt(m24[2], 10);
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
  }
  // Fallback to 12h with AM/PM
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m12) return null;
  let hh = parseInt(m12[1], 10);
  const mm = parseInt(m12[2], 10);
  const ampm = m12[3].toUpperCase();
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  return hh * 60 + mm;
}

function combineLocalDateMinutes(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return new Date(y, (m - 1), d, hh, mm, 0, 0);
}

const BookingForm: React.FC<BookingFormProps> = ({ venueId, sports, openingTime, closingTime, pricePerHour, onClose, onSaved }) => {
  const [form, setForm] = useState({
    sport: sports?.[0] || '',
    date: '',
    slotStartMin: -1, // minutes from 00:00
    durationMin: 60,
    court: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);

  const totalLabel = useMemo(() => {
    const p = pricePerHour ?? 0;
    const total = Math.round((p * form.durationMin) / 60);
    return `₹${total}.00`;
  }, [form.durationMin, pricePerHour]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'durationMin' ? Number(value) : value }));
  };

  // Load bookings for selected date
  useEffect(() => {
    const load = async () => {
      if (!form.date) { setDayBookings([]); return; }
      try {
        const res = await bookingAPI.getByVenue(venueId, { date: form.date });
        setDayBookings(res.data);
      } catch (e) {
        setDayBookings([]);
      }
    };
    load();
  }, [venueId, form.date]);

  // Compute available slots when date/duration/venue hours or bookings change
  useEffect(() => {
    if (!form.date) { setAvailableSlots([]); return; }
    const openMin = parse12hToMinutes(openingTime) ?? 7 * 60; // default 07:00
    const closeMin = parse12hToMinutes(closingTime) ?? 23 * 60; // default 23:00
    const step = form.durationMin; // step equals duration
    const slots: number[] = [];
    for (let start = openMin; start + step <= closeMin; start += step) {
      const end = start + step;
      const startDate = combineLocalDateMinutes(form.date, start);
      const endDate = combineLocalDateMinutes(form.date, end);
      const overlaps = dayBookings.some(b => {
        const bs = new Date(b.startAt).getTime();
        const be = new Date(b.endAt).getTime();
        return startDate.getTime() < be && endDate.getTime() > bs;
      });
      if (!overlaps) slots.push(start);
    }
    setAvailableSlots(slots);
    // Reset selected slot if it becomes invalid
    if (!slots.includes(form.slotStartMin)) {
      setForm(prev => ({ ...prev, slotStartMin: slots[0] ?? -1 }));
    }
  }, [form.date, form.durationMin, openingTime, closingTime, dayBookings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.sport || !form.date || form.slotStartMin < 0 || !form.durationMin) {
      setError('Please fill all required fields');
      return;
    }
    try {
      setLoading(true);
      const start = combineLocalDateMinutes(form.date, form.slotStartMin);
      const end = new Date(start.getTime() + form.durationMin * 60000);
      await bookingAPI.create({
        venue: venueId,
        sport: form.sport,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        court: form.court || undefined,
        notes: form.notes || undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={submit} className="card" style={{ width: 480, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Book This Venue</h3>
          <button type="button" className="btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}

        <div className="row" style={{ marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Sport</label>
            <select name="sport" className="select" value={form.sport} onChange={handleChange}>
              {sports.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Date</label>
            <input name="date" className="input" type="date" value={form.date} onChange={handleChange} />
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Duration</label>
            <select name="durationMin" className="select" value={form.durationMin} onChange={handleChange}>
              {minutesOptions.map(m => <option key={m} value={m}>{m}m</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Available Slots</label>
            <select
              name="slotStartMin"
              className="select"
              value={form.slotStartMin}
              onChange={(e) => setForm(prev => ({ ...prev, slotStartMin: Number(e.target.value) }))}
              disabled={!form.date || availableSlots.length === 0}
            >
              {availableSlots.length === 0 ? (
                <option value={-1}>No slots</option>
              ) : (
                availableSlots.map(min => {
                  const hh = Math.floor(min / 60);
                  const mm = min % 60;
                  const label = new Date(0,0,0,hh,mm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return <option key={min} value={min}>{label}</option>;
                })
              )}
            </select>
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Court</label>
            <input name="court" className="input" value={form.court} onChange={handleChange} placeholder="e.g., Court 1" />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="notes" className="input" style={{ minHeight: 80 }} value={form.notes} onChange={handleChange} placeholder="Optional" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div className="help">Total: {totalLabel}</div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
