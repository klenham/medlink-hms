import { useEffect, useState } from 'react';
import {
  Stethoscope,
  ClipboardList,
  Beaker,
  Pill,
  Send,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  FlaskConical,
  Hourglass,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  PencilLine,
  Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import HospitalUpdates from './HospitalUpdates';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, getDay,
} from 'date-fns';

export default function DoctorDashboard({ user }: { user: any }) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsult, setSelectedConsult] = useState<any>(null);
  const [activeView, setActiveView] = useState<'queue' | 'appointments' | 'records'>('queue');

  useEffect(() => {
    fetchReferred();
    const interval = setInterval(fetchReferred, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchReferred = async () => {
    try {
      const res = await fetch('/api/patients/referred', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Waitlist: {patients.length} patient{patients.length !== 1 ? 's' : ''} ready for consultation.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveView('queue')}
            className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
              activeView === 'queue' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'glass text-slate-500 hover:text-slate-700')}>
            Queue{patients.length > 0 ? ` (${patients.length})` : ''}
          </button>
          <button onClick={() => setActiveView('appointments')}
            className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
              activeView === 'appointments' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'glass text-slate-500 hover:text-slate-700')}>
            <CalendarCheck className="w-3.5 h-3.5" /> Appointments
          </button>
          <button onClick={() => setActiveView('records')}
            className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
              activeView === 'records' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'glass text-slate-500 hover:text-slate-700')}>
            <PencilLine className="w-3.5 h-3.5" /> Records
          </button>
        </div>
      </div>

      {activeView === 'appointments' && (
        <DoctorAppointments doctorId={user.id} />
      )}

      {activeView === 'records' && (
        <DoctorRecords />
      )}

      {activeView === 'queue' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {patients.map((p) => {
          const isResultsReady = p.queue_status === 'results_ready';
          const isAwaiting     = p.queue_status === 'awaiting_results';
          const clickable      = !isAwaiting;

          return (
            <motion.div
              key={p.id}
              layoutId={p.id}
              className={cn(
                "glass p-6 rounded-3xl transition-all",
                clickable ? "cursor-pointer" : "cursor-default opacity-80",
                isResultsReady && "hover:ring-2 hover:ring-blue-500/30 border-blue-200/40",
                !isResultsReady && !isAwaiting && "hover:ring-2 hover:ring-teal-500/20",
              )}
              onClick={() => clickable && setSelectedConsult(p)}
            >
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-[10px] font-black uppercase tracking-widest",
                isResultsReady ? "bg-blue-500/10 text-blue-600"
                  : isAwaiting ? "bg-amber-500/10 text-amber-600"
                  : "bg-teal-500/10 text-teal-600"
              )}>
                {isResultsReady ? <><FlaskConical className="w-3.5 h-3.5" /> Lab Results Ready — Click to Review</>
                  : isAwaiting  ? <><Hourglass className="w-3.5 h-3.5" /> Awaiting Lab Results</>
                  : <><Clock className="w-3.5 h-3.5" /> Waiting for Consultation</>
                }
              </div>

              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-bold",
                    isResultsReady ? "bg-blue-500" : isAwaiting ? "bg-amber-100" : "bg-teal-500/20"
                  )}>
                    <span className={cn(
                      "text-lg font-bold",
                      isResultsReady ? "text-white" : isAwaiting ? "text-amber-600" : "text-teal-700"
                    )} style={!isResultsReady && !isAwaiting ? { color: 'var(--color-primary-600)' } : {}}>
                      {p.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{p.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">ID: {p.patient_id}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'BP', value: p.bp || 'N/A' },
                  { label: 'Temp', value: `${p.temperature}°C` },
                  { label: 'Pulse', value: `${p.pulse} bpm` },
                  { label: 'SpO2', value: `${p.spo2}%` },
                ].map(v => (
                  <div key={v.label} className="glass-dark p-3 rounded-2xl">
                    <div className="text-[8px] font-black text-slate-400 uppercase">{v.label}</div>
                    <div className="text-sm font-bold text-slate-800">{v.value}</div>
                  </div>
                ))}
              </div>

              {p.nhis_number && (
                <div className="mb-4 px-4 py-3 bg-primary-50 rounded-2xl border border-primary-100/50 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-primary-600 uppercase mb-1 tracking-wider">Insurance (CCC)</p>
                    <p className="text-xs font-bold text-slate-700">
                      {p.ccc_status === 'generated' ? `Code: ${p.ccc}` :
                       p.ccc_status === 'inactive'  ? 'Card Inactive' :
                       'CCC Not Generated'}
                    </p>
                  </div>
                  {p.ccc_status === 'unable' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse outline outline-4 outline-orange-500/20 flex-shrink-0 ml-2"></div>
                  )}
                </div>
              )}

              {isAwaiting ? (
                <div className="w-full py-3 bg-amber-50 border border-amber-200/60 text-amber-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  <Hourglass className="w-4 h-4" /> Pending Lab Results
                </div>
              ) : (
                <button className={cn(
                  "w-full py-3 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  isResultsReady ? "bg-blue-500 hover:bg-blue-600" : ""
                )} style={isResultsReady ? {} : { backgroundColor: 'var(--color-primary-500)' }}>
                  {isResultsReady
                    ? <><FlaskConical className="w-4 h-4" /> Review Results & Finalize</>
                    : <><Stethoscope className="w-4 h-4" /> Start Consultation</>
                  }
                </button>
              )}
            </motion.div>
          );
        })}
        {patients.length === 0 && !loading && (
          <div className="col-span-full h-64 glass rounded-3xl flex flex-col items-center justify-center p-8 text-center bg-white/20">
            <Clock className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium italic">The waitlist is currently empty.</p>
          </div>
        )}
      </div>
      )}

      <HospitalUpdates user={user} />

      <AnimatePresence>
        {selectedConsult && (
          <ConsultationModal
            patient={selectedConsult}
            onClose={() => setSelectedConsult(null)}
            onComplete={() => { setSelectedConsult(null); fetchReferred(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Doctor Appointments View ─── */
function DoctorAppointments({ doctorId }: { doctorId: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [calMonth, setCalMonth] = useState(new Date());
  const token = () => sessionStorage.getItem('token') ?? '';

  useEffect(() => {
    fetch(`/api/admin/appointments?doctor_id=${doctorId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAppointments(data); });
  }, [doctorId]);

  const today = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const todayCount = appointments.filter(a => isSameDay(new Date(a.date), today)).length;

  const calStart = startOfMonth(calMonth);
  const calEnd = endOfMonth(calMonth);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const apptDates = appointments.map(a => new Date(a.date));
  const leadingBlanks = getDay(calStart);

  const TYPE_STYLE: Record<string, string> = {
    'follow-up': 'bg-blue-50 text-blue-600',
    consultation: 'bg-violet-50 text-violet-600',
    review: 'bg-teal-50 text-teal-700',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Today', value: todayCount, color: 'text-teal-600' },
            { label: 'Upcoming', value: upcoming.length, color: 'text-violet-600' },
          ].map(s => (
            <div key={s.label} className="glass p-4 rounded-2xl text-center">
              <div className={cn('text-2xl font-black', s.color)}>{s.value}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="glass p-5 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(m => subMonths(m, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-sm font-bold text-slate-800">{format(calMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCalMonth(m => addMonths(m, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-black text-slate-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array(leadingBlanks).fill(null).map((_, i) => <div key={`b${i}`} />)}
            {calDays.map(day => {
              const hasAppt = apptDates.some(d => isSameDay(d, day));
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-bold',
                    isToday ? 'bg-teal-500 text-white' : 'hover:bg-slate-50 text-slate-600',
                  )}>
                  {format(day, 'd')}
                  {hasAppt && (
                    <div className={cn('w-1 h-1 rounded-full mt-0.5', isToday ? 'bg-white' : 'bg-violet-500')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Upcoming Appointments</h3>
        {upcoming.length === 0 ? (
          <div className="text-center py-14 glass rounded-3xl">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No upcoming appointments scheduled</p>
          </div>
        ) : (
          upcoming.map(appt => (
            <div key={appt.id} className="glass p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-14 bg-violet-500/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-black text-violet-500 uppercase">{format(new Date(appt.date), 'MMM')}</span>
                <span className="text-xl font-black text-violet-700 leading-none">{format(new Date(appt.date), 'd')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800">{appt.patient_name}</p>
                {appt.notes && <p className="text-xs text-slate-400 mt-0.5 truncate italic">{appt.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={cn('text-[10px] font-black uppercase px-2.5 py-1 rounded-lg', TYPE_STYLE[appt.type] || TYPE_STYLE.review)}>
                  {appt.type}
                </span>
                <span className="text-xs text-slate-400">{appt.time}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Doctor Records (Amend Consultations) ─── */
function DoctorRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [amendTarget, setAmendTarget] = useState<any | null>(null);
  const token = () => sessionStorage.getItem('token') ?? '';

  useEffect(() => {
    fetch('/api/history/doctor/consultations', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRecords(data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (r.patient?.name || '').toLowerCase().includes(q) ||
           (r.patient?.patient_id || '').toLowerCase().includes(q) ||
           (r.illness || '').toLowerCase().includes(q);
  });

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by patient name, ID, or diagnosis…"
            className="w-full bg-white/60 border border-white/40 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400"
          />
        </div>
        <p className="text-xs text-slate-400 font-bold">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading records…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-3xl">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No consultation records found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r._id} className="glass p-5 rounded-2xl flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-black flex items-center justify-center shrink-0">
                    {(r.patient?.name || 'P').charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{r.patient?.name || 'Unknown Patient'}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.patient?.patient_id} · {r.patient?.age}Y · {r.patient?.gender}</p>
                  </div>
                  <span className={cn('ml-auto text-[9px] font-black px-2 py-0.5 rounded-full shrink-0',
                    r.status === 'complete' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  )}>{r.status?.toUpperCase()}</span>
                </div>
                <p className="text-xs font-bold text-slate-700 pl-11">{r.illness || 'General Consultation'}</p>
                {r.treatment && <p className="text-[10px] text-slate-400 pl-11 mt-0.5">Tx: {r.treatment}</p>}
                <p className="text-[10px] text-slate-300 pl-11 mt-1">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setAmendTarget(r)}
                className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 font-bold text-[10px] px-3 py-2 rounded-xl hover:bg-indigo-100 transition-all shrink-0 border border-indigo-100">
                <PencilLine className="w-3.5 h-3.5" /> Amend
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {amendTarget && (
          <AmendModal
            record={amendTarget}
            onClose={() => setAmendTarget(null)}
            onSaved={() => {
              setAmendTarget(null);
              fetch('/api/history/doctor/consultations', { headers: { Authorization: `Bearer ${token()}` } })
                .then(r => r.json()).then(data => { if (Array.isArray(data)) setRecords(data); });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Amend Modal ─── */
function AmendModal({ record, onClose, onSaved }: { record: any; onClose: () => void; onSaved: () => void }) {
  const [illness, setIllness] = useState(record.illness || '');
  const [treatment, setTreatment] = useState(record.treatment || '');
  const [notes, setNotes] = useState(record.notes || '');
  const [rxItems, setRxItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const token = () => sessionStorage.getItem('token') ?? '';

  const inputCls = "w-full bg-white/60 border border-white/40 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400";
  const labelCls = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block";

  useEffect(() => {
    fetch('/api/stations/pharmacy/inventory', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setInventory).catch(() => {});
  }, []);

  const getSuggestions = (q: string) =>
    q.length < 1 ? [] : inventory.filter((i: any) => i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  const addRx = () => setRxItems(prev => [...prev, { drug_name: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', in_stock: null }]);
  const removeRx = (i: number) => setRxItems(prev => prev.filter((_, idx) => idx !== i));
  const updateRx = (i: number, patch: Record<string, any>) =>
    setRxItems(prev => prev.map((item, idx) => idx === i ? { ...item, ...patch } : item));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/history/consultation/${record._id}/amend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          illness, treatment, notes,
          medications: rxItems.filter(r => r.drug_name.trim()),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      onSaved();
    } catch (err: any) {
      console.error('Amend error:', err);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="glass-card w-full max-w-2xl p-0 max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <PencilLine className="w-4 h-4 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-800">Amend Consultation</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{record.patient?.name} · {record.patient?.patient_id} · {new Date(record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Diagnosis / Treatment / Notes */}
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Diagnosis / Chief Complaint</label>
              <input value={illness} onChange={e => setIllness(e.target.value)} placeholder="e.g. Typhoid Fever, Malaria" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Treatment / Management Plan</label>
              <input value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="e.g. Bed rest, rehydration" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Clinical observations, examination findings…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {/* Add more drugs */}
          <div className="border border-white/30 rounded-2xl p-4 bg-white/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-500" />
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Add Prescriptions</h4>
              </div>
              <button type="button" onClick={addRx}
                className="text-indigo-600 text-[10px] font-black uppercase tracking-wider hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                + Add Drug
              </button>
            </div>

            {rxItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No new drugs — click &ldquo;+ Add Drug&rdquo; to add more medications.</p>
            ) : (
              <div className="space-y-3">
                {rxItems.map((rx, i) => {
                  const suggestions = getSuggestions(rx.drug_name);
                  return (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
                      <div className="p-3.5 flex gap-2 items-center">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                        <div className="relative flex-1 min-w-0">
                          <input value={rx.drug_name}
                            onChange={e => { updateRx(i, { drug_name: e.target.value, in_stock: null }); setOpenDropdownIdx(i); }}
                            onFocus={() => setOpenDropdownIdx(i)}
                            onBlur={() => setTimeout(() => setOpenDropdownIdx(null), 150)}
                            placeholder="Drug name — type to search inventory"
                            className={`${inputCls} w-full`}
                          />
                          {openDropdownIdx === i && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                              {suggestions.map((item: any) => (
                                <button key={item.id} type="button"
                                  onMouseDown={() => { updateRx(i, { drug_name: item.name, in_stock: item.quantity > 0 }); setOpenDropdownIdx(null); }}
                                  className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                >
                                  <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                  <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0', item.quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                                    {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeRx(i)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 shrink-0 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="px-3.5 pb-3.5 grid grid-cols-2 gap-2 border-t border-gray-50 pt-3 bg-slate-50/40">
                        <div><label className={labelCls}>Dosage</label><input value={rx.dosage} onChange={e => updateRx(i, { dosage: e.target.value })} placeholder="e.g. 500mg" className={inputCls} /></div>
                        <div><label className={labelCls}>Frequency</label><input value={rx.frequency} onChange={e => updateRx(i, { frequency: e.target.value })} placeholder="e.g. TDS, BD" className={inputCls} /></div>
                        <div><label className={labelCls}>Duration</label><input value={rx.duration} onChange={e => updateRx(i, { duration: e.target.value })} placeholder="e.g. 5 days" className={inputCls} /></div>
                        <div><label className={labelCls}>Quantity</label><input value={rx.quantity} onChange={e => updateRx(i, { quantity: e.target.value })} placeholder="e.g. 15 tablets" className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>Instructions</label><input value={rx.instructions} onChange={e => updateRx(i, { instructions: e.target.value })} placeholder="e.g. Take after meals" className={inputCls} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/20 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 font-bold text-white rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--color-primary-500)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Amendments'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Consultation Modal ─── */
function ConsultationModal({ patient, onClose, onComplete }: {
  patient: any; onClose: () => void; onComplete: () => void;
}) {
  const [illness, setIllness] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [labInput, setLabInput] = useState('');
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [rxItems, setRxItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [fetchingPending, setFetchingPending] = useState(false);
  const [addendumDiagnosis, setAddendumDiagnosis] = useState('');
  const [addendumPlan, setAddendumPlan] = useState('');
  const [addendumNotes, setAddendumNotes] = useState('');

  const token = () => sessionStorage.getItem('token') ?? '';
  const isResultsReady = patient?.queue_status === 'results_ready';

  useEffect(() => {
    fetch('/api/stations/pharmacy/inventory', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setInventory).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isResultsReady) return;
    setFetchingPending(true);
    fetch(`/api/history/consultation/pending/${patient.id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(data => {
        setPendingData(data.consultation || null);
        setLabResults(data.lab_results || []);
        setIllness(data.consultation?.illness || '');
        setTreatment(data.consultation?.treatment || '');
        setNotes(data.consultation?.notes || '');
        setAddendumDiagnosis(data.consultation?.addendum_diagnosis || '');
        setAddendumPlan(data.consultation?.addendum_plan || '');
        setAddendumNotes(data.consultation?.addendum_notes || '');
      })
      .catch(err => {
        console.error('Failed to fetch pending consultation', err);
      })
      .finally(() => setFetchingPending(false));
  }, [isResultsReady, patient.id]);

  const getSuggestions = (q: string) =>
    q.length < 1 ? [] : inventory.filter((i: any) => i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  const addRx = () => setRxItems(prev => [...prev, { drug_name: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', in_stock: null }]);
  const removeRx = (i: number) => setRxItems(prev => prev.filter((_, idx) => idx !== i));
  const updateRx = (i: number, patch: Record<string, any>) =>
    setRxItems(prev => prev.map((item, idx) => idx === i ? { ...item, ...patch } : item));

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const endpoint = isResultsReady ? '/api/history/consultation/finalize' : '/api/history/consultation/complete';
      const payload: any = { patient_id: patient.id };

      if (isResultsReady) {
        payload.addendum_diagnosis = addendumDiagnosis;
        payload.addendum_plan = addendumPlan;
        payload.addendum_notes = addendumNotes;
      } else {
        payload.illness = illness;
        payload.treatment = treatment;
        payload.notes = notes;
        payload.lab_requests = labRequests.map(l => ({ type: l.type, notes: l.notes || '' }));
        payload.prescriptions = rxItems.map(r => ({ drug_name: r.drug_name, dosage: r.dosage, frequency: r.frequency, duration: r.duration, quantity: r.quantity, instructions: r.instructions }));
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to complete consultation');
      toast.success('Consultation saved successfully');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save consultation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Consultation — {patient?.name || 'Patient'}</h2>
            <p className="text-sm text-slate-500">Patient ID: {patient?.patient_id || 'N/A'} · Status: {patient?.queue_status || 'unknown'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 p-6 overflow-y-auto min-h-0">
          <div className="space-y-6 min-h-0">
            {!isResultsReady ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Diagnosis / Chief Complaint</label>
                  <input value={illness} onChange={e => setIllness(e.target.value)} placeholder="e.g. Malaria, Typhoid"
                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Treatment / Plan</label>
                  <input value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="e.g. Rehydration, antibiotics"
                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</label>
                  <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Clinical notes and exam findings"
                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Existing consultation</p>
                  <p className="mt-2 text-sm text-slate-700">{pendingData?.illness || 'No previous summary available yet.'}</p>
                  <p className="mt-2 text-sm text-slate-700">{pendingData?.notes || 'No recorded notes yet.'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Addendum Diagnosis</label>
                  <input value={addendumDiagnosis} onChange={e => setAddendumDiagnosis(e.target.value)} placeholder="Final diagnosis"
                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Addendum Plan</label>
                  <textarea rows={3} value={addendumPlan} onChange={e => setAddendumPlan(e.target.value)} placeholder="Final management plan"
                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Addendum Notes</label>
                  <textarea rows={3} value={addendumNotes} onChange={e => setAddendumNotes(e.target.value)} placeholder="Additional observations after lab review"
                    className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
            )}

            {!isResultsReady && (
              <div className="grid gap-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lab requests</p>
                      <p className="text-xs text-slate-500">Request tests before completing consultation.</p>
                    </div>
                    <button onClick={addLabRequest} className="text-sm font-bold text-teal-600">Add</button>
                  </div>
                  <div className="flex gap-2">
                    <input value={labInput} onChange={e => setLabInput(e.target.value)} placeholder="e.g. FBC, Malaria RDT"
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none" />
                  </div>
                  {labRequests.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {labRequests.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.type}</p>
                          </div>
                          <button onClick={() => handleRemoveLab(item.id)} className="text-xs font-black uppercase tracking-widest text-rose-500">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-white/30 rounded-2xl p-4 bg-white/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-500" />
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Add Prescriptions</h4>
              </div>
              <button type="button" onClick={addRx}
                className="text-indigo-600 text-[10px] font-black uppercase tracking-wider hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                + Add Drug
              </button>
            </div>

            {rxItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No new drugs — click &ldquo;+ Add Drug&rdquo; to add more medications.</p>
            ) : (
              <div className="space-y-3">
                {rxItems.map((rx, i) => {
                  const suggestions = getSuggestions(rx.drug_name);
                  return (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
                      <div className="p-3.5 flex gap-2 items-center">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                        <div className="relative flex-1 min-w-0">
                          <input value={rx.drug_name}
                            onChange={e => { updateRx(i, { drug_name: e.target.value, in_stock: null }); setOpenDropdownIdx(i); }}
                            onFocus={() => setOpenDropdownIdx(i)}
                            onBlur={() => setTimeout(() => setOpenDropdownIdx(null), 150)}
                            placeholder="Drug name — type to search inventory"
                            className={`${inputCls} w-full`}
                          />
                          {openDropdownIdx === i && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                              {suggestions.map((item: any) => (
                                <button key={item.id} type="button"
                                  onMouseDown={() => { updateRx(i, { drug_name: item.name, in_stock: item.quantity > 0 }); setOpenDropdownIdx(null); }}
                                  className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                >
                                  <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                  <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0', item.quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                                    {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeRx(i)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 shrink-0 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="px-3.5 pb-3.5 grid grid-cols-2 gap-2 border-t border-gray-50 pt-3 bg-slate-50/40">
                        <div><label className={labelCls}>Dosage</label><input value={rx.dosage} onChange={e => updateRx(i, { dosage: e.target.value })} placeholder="e.g. 500mg" className={inputCls} /></div>
                        <div><label className={labelCls}>Frequency</label><input value={rx.frequency} onChange={e => updateRx(i, { frequency: e.target.value })} placeholder="e.g. TDS, BD" className={inputCls} /></div>
                        <div><label className={labelCls}>Duration</label><input value={rx.duration} onChange={e => updateRx(i, { duration: e.target.value })} placeholder="e.g. 5 days" className={inputCls} /></div>
                        <div><label className={labelCls}>Quantity</label><input value={rx.quantity} onChange={e => updateRx(i, { quantity: e.target.value })} placeholder="e.g. 15 tablets" className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>Instructions</label><input value={rx.instructions} onChange={e => updateRx(i, { instructions: e.target.value })} placeholder="e.g. Take after meals" className={inputCls} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Patient summary</h3>
              <div className="space-y-3 text-sm text-slate-700">
                <p><strong>Name:</strong> {patient?.name}</p>
                <p><strong>ID:</strong> {patient?.patient_id}</p>
                <p><strong>Age:</strong> {patient?.age || '—'}</p>
                <p><strong>Gender:</strong> {patient?.gender || '—'}</p>
                <p><strong>Status:</strong> {patient?.queue_status}</p>
              </div>
            </div>

            {isResultsReady && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lab results</p>
                    <p className="text-xs text-slate-500">Review completed tests before finalizing.</p>
                  </div>
                  {fetchingPending && <span className="text-[10px] uppercase tracking-widest text-slate-400">Loading…</span>}
                </div>
                {labResults.length === 0 ? (
                  <p className="text-sm text-slate-500">No lab results available yet.</p>
                ) : (
                  <div className="space-y-3">
                    {labResults.map((result: any, index: number) => (
                      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-bold text-slate-800">{result.test_type}</p>
                        <p className="text-sm text-slate-600 mt-1">{result.result || 'Result pending'}</p>
                        {result.notes && <p className="text-xs text-slate-500 mt-1">{result.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-200 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleComplete} disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isResultsReady ? 'Finalize Consultation & Generate Bill' : 'Complete Consultation & Generate Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}
