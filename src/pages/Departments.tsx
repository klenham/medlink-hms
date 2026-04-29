import { useEffect, useState, useCallback } from 'react';
import {
  Building2, Users, Stethoscope, FlaskConical, Pill, DollarSign,
  Shield, BedDouble, Plus, X, Search, Loader2, LogOut, AlertTriangle,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const DEPARTMENTS = [
  { id: 'doctor',         label: 'Outpatient (OPD)',  icon: Stethoscope,  color: 'bg-teal-500',   light: 'bg-teal-50  text-teal-700' },
  { id: 'nurse',          label: 'Nursing',           icon: Users,        color: 'bg-blue-500',   light: 'bg-blue-50  text-blue-700' },
  { id: 'lab_technician', label: 'Laboratory',        icon: FlaskConical, color: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700' },
  { id: 'pharmacist',     label: 'Pharmacy',          icon: Pill,         color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700' },
  { id: 'accounts',       label: 'Accounts / Billing', icon: DollarSign,  color: 'bg-amber-500',  light: 'bg-amber-50  text-amber-700' },
  { id: 'admin',          label: 'Administration',    icon: Shield,       color: 'bg-slate-600',  light: 'bg-slate-100 text-slate-700' },
];

const URGENCY_COLOR: Record<string, string> = {
  routine: 'bg-slate-100 text-slate-600',
  urgent: 'bg-amber-100 text-amber-700',
  emergency: 'bg-red-100 text-red-700',
};

const WARDS = ['General Ward', 'Male Ward', 'Female Ward', 'Pediatric Ward', 'Maternity Ward', 'ICU', 'Surgical Ward', 'Emergency'];

function AdmitModal({ onClose, onAdmitted }: { onClose: () => void; onAdmitted: () => void }) {
  const [patientQ, setPatientQ] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ reason: '', ward: 'General Ward', urgency: 'routine', notes: '' });
  const [saving, setSaving] = useState(false);
  const token = () => sessionStorage.getItem('token') || '';

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
    if (!selected) { toast.error('Select a patient'); return; }
    if (!form.reason.trim()) { toast.error('Enter admission reason'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ patient_id: selected.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`${selected.name} admitted to ${form.ward}`);
      onAdmitted();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
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
          <h2 className="text-xl font-bold text-slate-800">Admit Patient</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <label className={labelCls}>Patient</label>
            {selected ? (
              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-teal-800">{selected.name}</p>
                  <p className="text-[10px] text-teal-500 font-mono">{selected.patient_id}</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setPatientQ(''); }}
                  className="p-1 hover:bg-teal-100 rounded-lg"><X className="w-3.5 h-3.5 text-teal-500" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={patientQ} onChange={e => setPatientQ(e.target.value)}
                  placeholder="Search patient…" className={`${inputCls} pl-9`} autoFocus />
                {patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-10 max-h-48 overflow-y-auto">
                    {patients.map((p: any) => (
                      <button key={p.id} type="button"
                        onClick={() => { setSelected(p); setPatients([]); setPatientQ(''); }}
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

          <div>
            <label className={labelCls}>Ward</label>
            <select value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))} className={inputCls}>
              {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Urgency</label>
            <div className="grid grid-cols-3 gap-2">
              {['routine', 'urgent', 'emergency'].map(u => (
                <button key={u} type="button"
                  onClick={() => setForm(f => ({ ...f, urgency: u }))}
                  className={cn('py-2 text-[10px] font-black uppercase rounded-xl border-2 transition-all',
                    form.urgency === u ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-transparent bg-surface-50 text-slate-500 hover:border-slate-200')}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Reason for Admission</label>
            <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Severe malaria, post-operative recovery…" className={inputCls} required />
          </div>

          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional clinical notes…" className={`${inputCls} resize-none`} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110 transition-all"
            style={{ backgroundColor: 'var(--color-primary-500)' }}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Admitting…</> : <><BedDouble className="w-4 h-4" />Admit Patient</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function Departments() {
  const [staff, setStaff] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmit, setShowAdmit] = useState(false);
  const [dischargingId, setDischargingId] = useState<string | null>(null);

  const token = () => sessionStorage.getItem('token') || '';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, admRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/admin/admissions', { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [usersData, admData] = await Promise.all([usersRes.json(), admRes.json()]);
      setStaff(Array.isArray(usersData) ? usersData : []);
      setAdmissions(Array.isArray(admData) ? admData : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const discharge = async (id: string, name: string) => {
    if (!confirm(`Discharge ${name}?`)) return;
    setDischargingId(id);
    try {
      const res = await fetch(`/api/admin/admissions/${id}/discharge`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`${name} discharged`);
      setAdmissions(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Failed to discharge patient');
    } finally { setDischargingId(null); }
  };

  const staffByRole = (roleId: string) => staff.filter(s => s.role === roleId);

  const wardGroups = WARDS.map(w => ({
    ward: w,
    patients: admissions.filter(a => a.ward === w),
  })).filter(g => g.patients.length > 0);

  const otherAdmissions = admissions.filter(a => !WARDS.includes(a.ward));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Departments</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {staff.length} staff · {admissions.length} admitted patient{admissions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowAdmit(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:brightness-110"
          style={{ backgroundColor: 'var(--color-primary-500)' }}>
          <Plus className="w-4 h-4" /> Admit Patient
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Department cards */}
          <section>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Departments &amp; Staff</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEPARTMENTS.map(dept => {
                const members = staffByRole(dept.id);
                const Icon = dept.icon;
                return (
                  <motion.div key={dept.id} layout
                    className="glass rounded-2xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', dept.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{dept.label}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          {members.length} staff member{members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {members.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No staff assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {members.slice(0, 4).map(m => (
                          <div key={m.id} className="flex items-center gap-2">
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black', dept.light)}>
                              {m.name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{m.name}</p>
                              {m.specialty && <p className="text-[10px] text-slate-400 truncate">{m.specialty}</p>}
                            </div>
                            <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full',
                              m.availability === 'unavailable' ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-600')}>
                              {m.availability === 'unavailable' ? 'Away' : 'Active'}
                            </span>
                          </div>
                        ))}
                        {members.length > 4 && (
                          <p className="text-[10px] text-slate-400 pl-9">+{members.length - 4} more</p>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Inpatients / Wards */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Inpatients &amp; Wards
                {admissions.length > 0 && (
                  <span className="ml-2 bg-teal-500 text-white text-[9px] px-2 py-0.5 rounded-full">{admissions.length}</span>
                )}
              </h2>
            </div>

            {admissions.length === 0 ? (
              <div className="glass rounded-2xl py-12 text-center text-slate-400">
                <BedDouble className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-bold text-slate-500">No current admissions</p>
                <p className="text-sm mt-1">Click "Admit Patient" to add one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wardGroups.map(({ ward, patients }) => (
                  <div key={ward} className="glass rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/20 bg-white/20">
                      <BedDouble className="w-4 h-4 text-slate-500" />
                      <h3 className="text-sm font-bold text-slate-700">{ward}</h3>
                      <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                        {patients.length} patient{patients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="divide-y divide-white/10">
                      {patients.map(a => (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-black text-xs shrink-0">
                            {a.patient_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm">{a.patient_name}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                              <span className="font-mono">{a.patient_id}</span>
                              <span>·</span>
                              <span>Admitted {a.admission_date ? format(new Date(a.admission_date), 'dd MMM yyyy') : '—'}</span>
                              {a.admitted_by_name && <span>· by {a.admitted_by_name}</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{a.reason}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full', URGENCY_COLOR[a.urgency] || 'bg-slate-100 text-slate-500')}>
                              {a.urgency}
                            </span>
                            <button
                              onClick={() => discharge(a.id, a.patient_name)}
                              disabled={dischargingId === a.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40"
                            >
                              {dischargingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                              Discharge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {otherAdmissions.length > 0 && (
                  <div className="glass rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/20 bg-white/20">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-700">Unassigned Ward</h3>
                    </div>
                    <div className="divide-y divide-white/10">
                      {otherAdmissions.map(a => (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm">{a.patient_name}</p>
                            <p className="text-[11px] text-slate-400">{a.patient_id} · {a.ward || 'No ward'}</p>
                          </div>
                          <button onClick={() => discharge(a.id, a.patient_name)} disabled={dischargingId === a.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40">
                            <LogOut className="w-3 h-3" /> Discharge
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <AnimatePresence>
        {showAdmit && <AdmitModal onClose={() => setShowAdmit(false)} onAdmitted={fetchAll} />}
      </AnimatePresence>
    </div>
  );
}
