import { useEffect, useState, useCallback } from 'react';
import {
  Calendar, Plus, Search, Clock, User, Stethoscope, Check, X,
  ChevronLeft, ChevronRight, Loader2, CalendarDays, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const TYPE_LABEL: Record<string, string> = {
  review: 'Review',
  consultation: 'Consultation',
  'follow-up': 'Follow-up',
  emergency: 'Emergency',
};

const TYPE_COLOR: Record<string, string> = {
  review: 'bg-blue-100 text-blue-700',
  consultation: 'bg-teal-100 text-teal-700',
  'follow-up': 'bg-purple-100 text-purple-700',
  emergency: 'bg-red-100 text-red-700',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function dateLabel(dateStr: string) {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE dd MMM yyyy');
}

function ApptCard({ appt, onAction }: { appt: any; onAction: (id: string, action: string) => void }) {
  const d = new Date(appt.date);
  const overdue = appt.status === 'scheduled' && isPast(d) && !isToday(d);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass rounded-2xl p-5 flex gap-4 items-start',
        overdue && 'border border-red-200'
      )}
    >
      {/* Date block */}
      <div className={cn(
        'shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold',
        isToday(d) ? 'bg-teal-500 text-white' : 'bg-white/60 text-slate-700'
      )}>
        <span className="text-lg leading-none">{format(d, 'dd')}</span>
        <span className="text-[10px] uppercase tracking-wider">{format(d, 'MMM')}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-bold text-slate-800 text-sm">{appt.patient?.name || 'Unknown Patient'}</p>
            <p className="text-[10px] text-slate-400 font-mono">{appt.patient?.patient_id}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {overdue && (
              <span className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Overdue
              </span>
            )}
            <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full', TYPE_COLOR[appt.type] || 'bg-slate-100 text-slate-600')}>
              {TYPE_LABEL[appt.type] || appt.type}
            </span>
            <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full', STATUS_COLOR[appt.status] || 'bg-slate-100 text-slate-500')}>
              {appt.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.time}</span>
          {appt.doctor && (
            <span className="flex items-center gap-1">
              <Stethoscope className="w-3 h-3" />
              Dr. {appt.doctor.name}
              {appt.doctor.specialty ? ` · ${appt.doctor.specialty}` : ''}
            </span>
          )}
        </div>

        {appt.notes && (
          <p className="text-[11px] text-slate-400 mt-1.5 italic truncate">{appt.notes}</p>
        )}

        {appt.status === 'scheduled' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAction(appt.id, 'completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              <Check className="w-3 h-3" /> Complete
            </button>
            <button
              onClick={() => onAction(appt.id, 'cancelled')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NewApptModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: any) => void }) {
  const [patientQ, setPatientQ] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState({ doctor_id: '', date: '', time: '10:00', type: 'review', notes: '' });
  const [saving, setSaving] = useState(false);
  const token = () => sessionStorage.getItem('token') || '';

  useEffect(() => {
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => setDoctors(Array.isArray(data) ? data.filter((u: any) => u.role === 'doctor') : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (patientQ.length < 2) { setPatients([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(patientQ)}&limit=8`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(data => setPatients(data.patients || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientQ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { toast.error('Select a patient'); return; }
    if (!form.date) { toast.error('Select a date'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ patient_id: selectedPatient.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Appointment scheduled');
      onCreated(data);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-surface-50 rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20';
  const labelCls = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="glass-card w-full max-w-lg p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Schedule Appointment</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Patient search */}
          <div className="relative">
            <label className={labelCls}>Patient</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-teal-800">{selectedPatient.name}</p>
                  <p className="text-[10px] text-teal-500 font-mono">{selectedPatient.patient_id}</p>
                </div>
                <button type="button" onClick={() => { setSelectedPatient(null); setPatientQ(''); }}
                  className="p-1 hover:bg-teal-100 rounded-lg"><X className="w-3.5 h-3.5 text-teal-500" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={patientQ} onChange={e => setPatientQ(e.target.value)}
                  placeholder="Search patient by name or ID…"
                  className={`${inputCls} pl-9`} autoFocus />
                {patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10 max-h-48 overflow-y-auto">
                    {patients.map((p: any) => (
                      <button key={p.id} type="button"
                        onClick={() => { setSelectedPatient(p); setPatients([]); setPatientQ(''); }}
                        className="w-full px-4 py-2.5 text-left hover:bg-teal-50 flex items-center gap-3 transition-colors">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.patient_id}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className={labelCls}>Doctor (optional)</label>
            <select value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
              className={inputCls}>
              <option value="">— No specific doctor —</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` (${d.specialty})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className={inputCls} />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className={labelCls}>Appointment Type</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_LABEL).map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => setForm(f => ({ ...f, type: val }))}
                  className={cn('py-2 text-[10px] font-black uppercase rounded-xl border-2 transition-all',
                    form.type === val ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-transparent bg-surface-50 text-slate-500 hover:border-slate-200')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any specific instructions or reason for visit…"
              className={`${inputCls} resize-none`} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:brightness-110"
            style={{ backgroundColor: 'var(--color-primary-500)' }}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Scheduling…</> : <><Calendar className="w-4 h-4" />Schedule Appointment</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function Appointments() {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const token = () => sessionStorage.getItem('token') || '';

  const fetch_ = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/appointments?status=${status}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setAppts(Array.isArray(data) ? data : []);
    } catch { setAppts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch_(tab === 'upcoming' ? 'scheduled' : 'completed,cancelled');
  }, [tab, fetch_]);

  const handleAction = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(status === 'completed' ? 'Appointment completed' : 'Appointment cancelled');
      setAppts(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Failed to update appointment');
    }
  };

  const filtered = appts.filter(a =>
    !search ||
    a.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.patient?.patient_id?.toLowerCase().includes(search.toLowerCase()) ||
    a.doctor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const today = appts.filter(a => isToday(new Date(a.date))).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-sm text-slate-400 mt-0.5">{today > 0 ? `${today} appointment${today !== 1 ? 's' : ''} today` : 'Manage patient appointments'}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:brightness-110"
          style={{ backgroundColor: 'var(--color-primary-500)' }}
        >
          <Plus className="w-4 h-4" /> New Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Today', value: today, icon: CalendarDays, color: 'text-teal-600 bg-teal-50' },
          { label: 'Upcoming', value: appts.filter(a => a.status === 'scheduled').length, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Overdue', value: appts.filter(a => a.status === 'scheduled' && isPast(new Date(a.date)) && !isToday(new Date(a.date))).length, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4">
        <div className="flex bg-white/60 rounded-xl p-1 gap-1">
          {(['upcoming', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                tab === t ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600')}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient name, ID, or doctor…"
            className="w-full bg-white/60 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl py-20 text-center text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base font-bold text-slate-500">No appointments found</p>
          <p className="text-sm mt-1">{tab === 'upcoming' ? 'Click "New Appointment" to schedule one.' : 'No past records.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(appt => (
              <ApptCard key={appt.id} appt={appt} onAction={handleAction} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showNew && <NewApptModal onClose={() => setShowNew(false)} onCreated={a => setAppts(prev => [a, ...prev])} />}
      </AnimatePresence>
    </div>
  );
}
