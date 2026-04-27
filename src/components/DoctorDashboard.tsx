import React, { useEffect, useState } from 'react';
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
  AlertTriangle,
  FileText,
  Hourglass,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
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
  const [activeView, setActiveView] = useState<'queue' | 'appointments'>('queue');

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
        </div>
      </div>

      {activeView === 'appointments' && (
        <DoctorAppointments doctorId={user.id} />
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
              {/* Status banner */}
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
                    ? <><FileText className="w-4 h-4" /> Review Results & Finalize</>
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
            doctorName={user?.name}
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
      {/* ── Left: Stats + Calendar ── */}
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

        {/* Month calendar */}
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

      {/* ── Right: Upcoming list ── */}
      <div className="lg:col-span-2 space-y-3">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Upcoming Appointments</h3>
        {upcoming.length === 0 ? (
          <div className="text-center py-14 glass rounded-3xl">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No upcoming appointments scheduled</p>
            <p className="text-xs text-slate-300 mt-1">Schedule follow-ups and reviews when completing consultations</p>
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
                {appt.patient?.patient_id && (
                  <p className="text-[10px] text-slate-400 uppercase font-black">{appt.patient.patient_id}</p>
                )}
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

/* ─── Constants ─── */
const UNIT_QTY_TYPES = ['Syrup', 'Suspension', 'Gel', 'Drops', 'Pessary', 'Cream', 'Ointment', 'Lotion'];
const DRUG_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Gel', 'Drops', 'Pessary', 'Cream', 'Ointment', 'Injection', 'Other'];
const FREQ_OPTIONS = [
  { label: 'Once daily',        value: 1 },
  { label: 'Twice daily',       value: 2 },
  { label: 'Three times daily', value: 3 },
  { label: 'Four times daily',  value: 4 },
];
function calcQty(drugType: string, doseQty: string, freq: string, days: string): number {
  if (UNIT_QTY_TYPES.includes(drugType)) return 1;
  return (parseInt(doseQty) || 0) * (parseInt(freq) || 0) * (parseInt(days) || 0);
}

function updateRx(list: any[], i: number, patch: Record<string, any>, setter: (v: any[]) => void) {
  setter(list.map((item, idx) => idx === i ? { ...item, ...patch } : item));
}

function extractMeasurement(name: string): string {
  const m = name.match(/\d+\s*(mg|g|ml|mcg|%|iu)\b/i);
  return m ? m[0].trim() : '';
}

function mapUnitToDrugType(unit: string): string {
  const u = (unit || '').toLowerCase();
  for (const t of DRUG_TYPES) { if (u.includes(t.toLowerCase())) return t; }
  return 'Tablet';
}

function buildInstructions(p: any): string {
  if (!p.name) return '';
  const freqLabel = FREQ_OPTIONS.find(f => String(f.value) === String(p.frequency))?.label || '';
  if (UNIT_QTY_TYPES.includes(p.drug_type)) {
    return p.duration ? `Use for ${p.duration} day${Number(p.duration) !== 1 ? 's' : ''} as directed` : 'Use as directed';
  }
  const dose = Number(p.dose_qty) || 1;
  const parts = [`Take ${dose} ${p.drug_type?.toLowerCase() || 'tablet'}${dose > 1 ? 's' : ''}`];
  if (freqLabel) parts.push(freqLabel.toLowerCase());
  if (p.duration) parts.push(`for ${p.duration} day${Number(p.duration) !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

/* ─── Consultation Modal ─── */
function ConsultationModal({ patient, doctorName, onClose, onComplete }: { patient: any; doctorName?: string; onClose: () => void; onComplete: () => void }) {
  const isResultsReady = patient.queue_status === 'results_ready';

  /* Form state */
  const [notes, setNotes] = useState('');
  const [illness, setIllness] = useState('');
  const [treatment, setTreatment] = useState('');
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [followup, setFollowup] = useState({ date: '', time: '', type: 'review' });

  /* Addendum state (for results_ready patients) */
  const [addendumNotes, setAddendumNotes] = useState('');
  const [addendumDiagnosis, setAddendumDiagnosis] = useState('');
  const [addendumPlan, setAddendumPlan] = useState('');
  const [labResults, setLabResults] = useState<any[]>([]);
  const [partialConsult, setPartialConsult] = useState<any>(null);

  /* Misc */
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [labsSent, setLabsSent] = useState(false);
  const [rxSent, setRxSent] = useState(false);
  const [sentLabRequests, setSentLabRequests] = useState<any[]>([]);
  const [sentPrescriptions, setSentPrescriptions] = useState<any[]>([]);
  const [sendingLabs, setSendingLabs] = useState(false);
  const [sendingRx, setSendingRx] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/history/tariffs/nhis', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
      .then(r => r.json()).then(setTariffs).catch(() => {});
    fetch('/api/stations/pharmacy/inventory', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
      .then(r => r.json()).then(setInventory).catch(() => {});

    if (isResultsReady) {
      fetch(`/api/history/consultation/pending/${patient.id}`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.consultation) {
            setPartialConsult(data.consultation);
            setIllness(data.consultation.illness || '');
            setTreatment(data.consultation.treatment || '');
            setNotes(data.consultation.notes || '');
          }
          setLabResults(data.lab_results || []);
        })
        .catch(() => {});
    }
  }, []);

  const getSuggestions = (query: string) =>
    query.length < 1 ? [] : inventory.filter(i => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  const addLab = () => setLabRequests(l => [...l, { type: '', notes: '' }]);
  const removeLab = (i: number) => setLabRequests(l => l.filter((_, idx) => idx !== i));

  const addRx = () => setPrescriptions(p => [...p, {
    name: '', measurement: '', drug_type: 'Tablet', dose_qty: '1', frequency: '1', duration: '', qty: 0, in_stock: null, inventory_id: null,
  }]);
  const removeRx = (i: number) => setPrescriptions(p => p.filter((_, idx) => idx !== i));

  const apiPost = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const printOutOfStockNotice = () => {
    const outOfStock = prescriptions.filter(p => p.in_stock === false && p.name);
    if (!outOfStock.length) return;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const rows = outOfStock.map((d, i) => {
      const qty = calcQty(d.drug_type, d.dose_qty, d.frequency, d.duration);
      return `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${i + 1}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-weight:700;">${d.name}${d.measurement ? ' ' + d.measurement : ''}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${d.drug_type}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:700;">${qty > 0 ? qty : 1}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${buildInstructions(d)}</td>
      </tr>`;
    }).join('');
    const win = window.open('', '_blank', 'width=720,height=640');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Drug Procurement Notice</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a2e;max-width:700px;}h2{font-size:17px;font-weight:800;margin:0;}table{width:100%;border-collapse:collapse;margin-top:16px;}th{background:#f5f7f9;padding:8px 14px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;}@media print{.no-print{display:none!important}}</style>
    </head><body>
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0d9488;padding-bottom:14px;margin-bottom:20px;">
      <div><h2>MEDLINK HMS</h2><p style="margin:3px 0 0;font-size:12px;color:#666;font-weight:600;">Drug Procurement Notice — Out of Stock</p></div>
      <div style="text-align:right;font-size:11px;color:#888;">${today}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;background:#f9fafb;padding:14px;border-radius:8px;">
      <div><div style="font-size:10px;color:#888;text-transform:uppercase;margin-bottom:3px;">Patient</div><div style="font-weight:700;">${patient.name}</div><div style="font-size:11px;color:#666;">${patient.patient_id || ''}</div></div>
      <div><div style="font-size:10px;color:#888;text-transform:uppercase;margin-bottom:3px;">Prescribed By</div><div style="font-weight:700;">${doctorName || 'Attending Doctor'}</div></div>
    </div>
    <p style="font-size:13px;color:#333;margin-bottom:8px;">The following medications have been prescribed but are <strong>currently out of stock</strong>. Please arrange urgent procurement or advise suitable substitutes:</p>
    <table>
      <thead><tr><th>#</th><th>Drug</th><th>Form</th><th>Qty Needed</th><th>Dosage Instructions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div style="border-top:1px solid #ccc;padding-top:10px;"><div style="font-size:10px;color:#888;">Prescribing Doctor</div><div style="font-weight:700;margin-top:20px;">${doctorName || 'Attending Doctor'}</div></div>
      <div style="border-top:1px solid #ccc;padding-top:10px;"><div style="font-size:10px;color:#888;">Date Issued</div><div style="font-weight:700;margin-top:4px;">${today}</div></div>
    </div>
    <div class="no-print" style="text-align:center;margin-top:28px;">
      <button onclick="window.print()" style="background:#0d9488;color:#fff;border:none;padding:10px 36px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">Print / Save PDF</button>
    </div></body></html>`);
    win.document.close();
  };

  const handleSendLabs = async () => {
    const valid = labRequests.filter(l => l.type.trim());
    if (!valid.length) { toast.error('Add at least one lab test first'); return; }
    setSendingLabs(true);
    try {
      await apiPost('/api/history/consultation/send-labs', { patient_id: patient.id, lab_requests: valid });
      setSentLabRequests(valid);
      setLabsSent(true);
      toast.success('Lab requests sent to laboratory', { description: `${valid.length} test(s) queued.` });
    } catch (err: any) {
      toast.error('Failed to send lab requests', { description: err.message });
    } finally { setSendingLabs(false); }
  };

  const handleSendRx = async () => {
    const valid = prescriptions.filter(p => p.name.trim());
    if (!valid.length) { toast.error('Add at least one prescription first'); return; }
    setSendingRx(true);
    try {
      await apiPost('/api/history/consultation/send-rx', { patient_id: patient.id, prescriptions: valid });
      setSentPrescriptions(valid);
      setPrescriptions([]);
      setRxSent(true);
      toast.success('Prescriptions sent to pharmacy', { description: `${valid.length} drug(s) queued for dispensing.` });
    } catch (err: any) {
      toast.error('Failed to send prescriptions', { description: err.message });
    } finally { setSendingRx(false); }
  };

  const handleAwaitResults = async () => {
    const validLabs = labRequests.filter(l => l.type.trim());
    if (!labsSent && !validLabs.length) {
      toast.error('Add at least one lab request before waiting for results');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/api/history/consultation/await-results', {
        patient_id: patient.id,
        illness, treatment, notes,
        lab_requests: validLabs,
        lab_already_sent: labsSent,
        prescriptions,
        rx_already_sent: rxSent,
      });
      toast.success('Patient is awaiting lab results', { description: 'Card stays in queue — you\'ll get an alert when results are ready.' });
      onComplete();
    } catch (err: any) {
      toast.error('Failed to set patient as awaiting results', { description: err.message });
    } finally { setSubmitting(false); setAwaitingConfirm(false); }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    const billItems = [{ name: 'Consultation Fee', price: 50, nhis_covered: false }];
    labRequests.forEach(l => {
      if (!l.type) return;
      const tariff = tariffs.find(t => t.name === l.type);
      billItems.push({ name: `Lab: ${l.type}`, price: tariff?.price ?? 100, nhis_covered: !!tariff });
    });
    prescriptions.forEach(p => {
      if (!p.name) return;
      const tariff = tariffs.find(t => t.name === p.name);
      billItems.push({ name: `Drug: ${p.name}`, price: tariff?.price ?? 20, nhis_covered: !!tariff });
    });

    try {
      if (followup.date) {
        await fetch('/api/admin/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
          body: JSON.stringify({ patient_id: patient.id, date: followup.date, time: followup.time || '10:00', type: followup.type }),
        });
      }
      const res = await fetch('/api/history/consultation/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({
          patient_id: patient.id, illness, treatment, notes,
          lab_requests: labsSent ? [] : labRequests,
          prescriptions: rxSent ? [] : prescriptions,
          bill_items: billItems,
        }),
      });
      if (res.ok) {
        toast.success('Consultation completed', { description: 'Bill and requests generated.' });
        onComplete();
      } else {
        toast.error('Failed to complete consultation');
      }
    } catch { toast.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleFinalize = async () => {
    if (!addendumDiagnosis.trim()) { toast.error('Enter a final diagnosis'); return; }
    setSubmitting(true);
    const billItems = [{ name: 'Consultation Fee', price: 50, nhis_covered: false }];
    try {
      if (followup.date) {
        await fetch('/api/admin/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
          body: JSON.stringify({ patient_id: patient.id, date: followup.date, time: followup.time || '10:00', type: followup.type }),
        });
      }
      const res = await fetch('/api/history/consultation/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ patient_id: patient.id, addendum_notes: addendumNotes, addendum_diagnosis: addendumDiagnosis, addendum_plan: addendumPlan, bill_items: billItems }),
      });
      if (res.ok) {
        toast.success('Consultation finalized', { description: 'Patient sent to billing.' });
        onComplete();
      } else {
        toast.error('Failed to finalize consultation');
      }
    } catch { toast.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const inputCls = "w-full bg-white/60 border border-white/40 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500/30 placeholder:text-slate-400";
  const labelCls = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="glass-card w-full max-w-5xl p-0 h-[90vh] flex overflow-hidden"
      >
        {/* ── Left: Patient Summary ── */}
        <div className="w-72 flex-shrink-0 glass-dark border-r border-white/20 flex flex-col overflow-y-auto">
          <div className="p-6">
            {isResultsReady && (
              <div className="mb-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2.5 rounded-xl">
                <FlaskConical className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest">Lab Results In</p>
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: 'var(--color-primary-500)' }}>
                {patient.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 leading-tight">{patient.name}</h2>
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{patient.gender}, {patient.age}Y</p>
              </div>
            </div>

            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Today's Vitals</h4>
            <div className="space-y-1 mb-6">
              {[
                { label: 'BP',     value: patient.bp },
                { label: 'Temp',   value: `${patient.temperature}°C` },
                { label: 'Weight', value: `${patient.weight}kg` },
                { label: 'Pulse',  value: `${patient.pulse}bpm` },
                { label: 'SpO2',   value: `${patient.spo2}%` },
              ].map(v => (
                <div key={v.label} className="flex justify-between items-center py-1.5 border-b border-white/10">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{v.label}</span>
                  <span className="text-xs font-bold text-slate-800">{v.value || '—'}</span>
                </div>
              ))}
            </div>

            {patient.nhis_number && (
              <div>
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Insurance</h4>
                <div className="p-4 rounded-2xl bg-primary-50 border border-primary-100/50">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-wider mb-1">GH-NHIS Card</p>
                  <p className="text-sm font-bold text-slate-800 mb-3 break-all">{patient.nhis_number}</p>
                  <span className={cn(
                    "text-[10px] font-black px-3 py-1.5 rounded-lg inline-block",
                    patient.ccc_status === 'generated' ? "bg-teal-500 text-white" :
                    patient.ccc_status === 'unable'    ? "bg-orange-500 text-white" :
                    "bg-red-500 text-white"
                  )}>
                    {patient.ccc_status === 'generated' ? `CCC: ${patient.ccc}` :
                     patient.ccc_status === 'unable'    ? 'CCC PENDING' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Consultation Forms ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-8 py-5 border-b border-white/20 flex justify-between items-center flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Clinical Consultation</h2>
              {isResultsReady && <p className="text-xs text-blue-600 font-bold mt-0.5">Reviewing lab results — complete with addendum below</p>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

            {/* ── Preliminary / existing notes (both modes) ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{isResultsReady ? 'Preliminary Diagnosis' : 'Primary Diagnosis'}</label>
                <input value={illness} onChange={e => setIllness(e.target.value)}
                  placeholder="e.g. Typhoid Fever"
                  className={cn(inputCls, isResultsReady && 'opacity-70')}
                  readOnly={isResultsReady}
                />
              </div>
              <div>
                <label className={labelCls}>General Treatment</label>
                <input value={treatment} onChange={e => setTreatment(e.target.value)}
                  placeholder="e.g. Bed rest, rehydration"
                  className={cn(inputCls, isResultsReady && 'opacity-70')}
                  readOnly={isResultsReady}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Consultation Notes</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Clinical observations, symptoms, history..."
                className={cn(`${inputCls} resize-none`, isResultsReady && 'opacity-70')}
                readOnly={isResultsReady}
              />
            </div>

            {/* ── Lab Results (results_ready mode) ── */}
            {isResultsReady && (
              <div className="border border-blue-200/50 rounded-2xl p-5 bg-blue-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <FlaskConical className="w-4 h-4 text-blue-500" />
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lab Results</h4>
                </div>
                {labResults.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-3">No results found.</p>
                ) : (
                  <div className="space-y-3">
                    {labResults.map((r: any, i: number) => (
                      <div key={i} className="bg-white/60 rounded-xl p-4 border border-blue-100/50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{r.test_type}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Done</span>
                        </div>
                        {r.notes && <p className="text-[10px] text-slate-400 mb-1">Notes: {r.notes}</p>}
                        <p className="text-sm font-bold text-slate-800 mt-1">{r.result || 'No result recorded'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Addendum (results_ready mode) ── */}
            {isResultsReady && (
              <div className="border border-primary-200/50 rounded-2xl p-5 bg-primary-50/20">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-4 h-4 text-primary-500" />
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Addendum — Final Assessment</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Final Diagnosis <span className="text-red-400">*</span></label>
                    <input value={addendumDiagnosis} onChange={e => setAddendumDiagnosis(e.target.value)}
                      placeholder="Confirmed diagnosis after lab results"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Treatment Plan</label>
                    <textarea rows={2} value={addendumPlan} onChange={e => setAddendumPlan(e.target.value)}
                      placeholder="Updated management plan based on results..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Additional Notes</label>
                    <textarea rows={2} value={addendumNotes} onChange={e => setAddendumNotes(e.target.value)}
                      placeholder="Any additional observations post lab review..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Lab Requests (new consultation only) ── */}
            {!isResultsReady && (
              <div className="border border-white/30 rounded-2xl p-5 bg-white/20">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-primary-500" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lab Requests</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {!labsSent && (
                    <>
                      <button
                        onClick={handleSendLabs}
                        disabled={sendingLabs || !labRequests.filter(l => l.type).length}
                        className="text-blue-600 text-[10px] font-black uppercase tracking-wider hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 flex items-center gap-1 transition-colors"
                      >
                        {sendingLabs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send to Lab
                      </button>
                      <button onClick={addLab} className="text-primary-600 text-[10px] font-black uppercase tracking-wider hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                        + Add Test
                      </button>
                    </>
                  )}
                  </div>
                </div>

                {/* Sent: awaiting result view */}
                {labsSent ? (
                  <div className="space-y-2">
                    {sentLabRequests.map((l, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-3 border border-amber-100/60">
                        <div>
                          <span className="text-xs font-bold text-slate-700">{l.type}</span>
                          {l.notes && <span className="text-[10px] text-slate-400 ml-2">· {l.notes}</span>}
                        </div>
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-lg flex-shrink-0">
                          <Clock className="w-3 h-3" /> Awaiting Lab Result
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {labRequests.length === 0 && <p className="text-xs text-slate-400 italic text-center py-3">No lab tests requested yet.</p>}
                    <div className="space-y-2">
                      {labRequests.map((l, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input value={l.type} onChange={e => { const nl = [...labRequests]; nl[i].type = e.target.value; setLabRequests(nl); }}
                            placeholder="Test name (e.g. Full Blood Count, Malaria RDT)" className={`${inputCls} flex-1`} />
                          <input value={l.notes} onChange={e => { const nl = [...labRequests]; nl[i].notes = e.target.value; setLabRequests(nl); }}
                            placeholder="Notes (optional)" className={`${inputCls} w-36`} />
                          <button onClick={() => removeLab(i)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0 transition-colors">
                            <X className="w-4 h-4"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Prescriptions (new consultation only) ── */}
            {!isResultsReady && (
              <div className="border border-white/30 rounded-2xl p-5 bg-white/20">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary-500" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prescriptions</h4>
                    {prescriptions.length > 0 && (
                      <span className="bg-primary-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{prescriptions.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!rxSent && (
                      <>
                        <button
                          onClick={handleSendRx}
                          disabled={sendingRx || !prescriptions.filter(p => p.name).length}
                          className="text-blue-600 text-[10px] font-black uppercase tracking-wider hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 flex items-center gap-1 transition-colors"
                        >
                          {sendingRx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send to Pharmacy
                        </button>
                        <button onClick={addRx} className="text-primary-600 text-[10px] font-black uppercase tracking-wider hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                          + Add Drug
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {rxSent ? (
                  <div>
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Prescription Sent to Pharmacy</p>
                        <p className="text-xs text-emerald-600 mt-0.5">{sentPrescriptions.length} drug(s) queued for dispensing</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {sentPrescriptions.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/70 rounded-xl px-4 py-2.5 border border-emerald-100/50">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-700">{p.name}{p.measurement ? ` ${p.measurement}` : ''}</span>
                            <span className="text-[10px] text-slate-400 ml-2">· {p.drug_type}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{buildInstructions(p)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {prescriptions.length === 0 && (
                      <div className="text-center py-6">
                        <Pill className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 italic">No drugs prescribed yet. Click "+ Add Drug" to begin.</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {prescriptions.map((p, i) => {
                        const isUnitQty = UNIT_QTY_TYPES.includes(p.drug_type);
                        const qty = calcQty(p.drug_type, p.dose_qty, p.frequency, p.duration);
                        const suggestions = getSuggestions(p.name);
                        const instructions = buildInstructions(p);
                        return (
                          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
                            {/* Row 1: Drug name + strength + form + remove */}
                            <div className="p-3.5 flex gap-2 items-center">
                              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-[10px] font-black flex items-center justify-center shrink-0">
                                {i + 1}
                              </div>
                              <div className="relative flex-1 min-w-0">
                                <input
                                  value={p.name}
                                  onChange={e => { updateRx(prescriptions, i, { name: e.target.value, in_stock: null, inventory_id: null }, setPrescriptions); setOpenDropdownIdx(i); }}
                                  onFocus={() => setOpenDropdownIdx(i)}
                                  onBlur={() => setTimeout(() => setOpenDropdownIdx(null), 150)}
                                  placeholder="Drug name — type to search inventory"
                                  className={`${inputCls} w-full`}
                                />
                                {openDropdownIdx === i && suggestions.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                                    {suggestions.map((item: any) => (
                                      <button key={item.id} type="button"
                                        onMouseDown={() => {
                                          updateRx(prescriptions, i, {
                                            name: item.name,
                                            measurement: extractMeasurement(item.name),
                                            drug_type: mapUnitToDrugType(item.unit),
                                            inventory_id: item.id,
                                            in_stock: item.quantity > 0,
                                          }, setPrescriptions);
                                          setOpenDropdownIdx(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-primary-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                      >
                                        <div>
                                          <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                          <span className="text-[10px] text-gray-400 ml-2">{item.unit}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0 ${item.quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                          {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <input
                                value={p.measurement}
                                onChange={e => updateRx(prescriptions, i, { measurement: e.target.value }, setPrescriptions)}
                                placeholder="Strength"
                                className={`${inputCls} w-24`}
                              />
                              <select
                                value={p.drug_type}
                                onChange={e => updateRx(prescriptions, i, { drug_type: e.target.value }, setPrescriptions)}
                                className={`${inputCls} w-28`}
                              >
                                {DRUG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <button onClick={() => removeRx(i)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 shrink-0 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Row 2: Dosage */}
                            <div className="px-3.5 pb-3.5 pt-3 flex gap-3 items-end border-t border-gray-50 bg-slate-50/40">
                              {isUnitQty ? (
                                <>
                                  <div className="flex-1">
                                    <label className={labelCls}>Instructions / Duration</label>
                                    <input
                                      value={p.duration}
                                      onChange={e => updateRx(prescriptions, i, { duration: e.target.value }, setPrescriptions)}
                                      placeholder="e.g. Apply twice daily for 5 days"
                                      className={inputCls}
                                    />
                                  </div>
                                  <div className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-[10px] font-black shrink-0">
                                    Qty: 1 unit
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-20">
                                    <label className={labelCls}>Dose</label>
                                    <input
                                      type="number" min="1" value={p.dose_qty}
                                      onChange={e => updateRx(prescriptions, i, { dose_qty: e.target.value }, setPrescriptions)}
                                      placeholder="1" className={inputCls}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className={labelCls}>Frequency</label>
                                    <select
                                      value={p.frequency}
                                      onChange={e => updateRx(prescriptions, i, { frequency: e.target.value }, setPrescriptions)}
                                      className={inputCls}
                                    >
                                      {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                    </select>
                                  </div>
                                  <div className="w-20">
                                    <label className={labelCls}>Days</label>
                                    <input
                                      type="number" min="1" value={p.duration}
                                      onChange={e => updateRx(prescriptions, i, { duration: e.target.value }, setPrescriptions)}
                                      placeholder="5" className={inputCls}
                                    />
                                  </div>
                                  <div className="shrink-0 text-center w-16">
                                    <div className={labelCls}>Total Qty</div>
                                    <div className={`py-2 rounded-xl text-xs font-black text-center ${qty > 0 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                      {qty > 0 ? qty : '—'}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Row 3: Instructions preview */}
                            {instructions && (
                              <div className="px-3.5 py-2 bg-slate-50 border-t border-gray-100 flex items-center gap-2 rounded-b-2xl">
                                <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">Rx:</span>
                                <span className="text-[10px] text-slate-600">{instructions}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Consolidated out-of-stock notice */}
                    {prescriptions.filter(p => p.in_stock === false && p.name).length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mt-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest">Out of Stock — Procurement Notice</h5>
                          </div>
                          <button
                            onClick={printOutOfStockNotice}
                            className="flex items-center gap-1.5 text-[10px] font-black text-red-600 border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <FileText className="w-3 h-3" /> Print Notice
                          </button>
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {prescriptions.filter(p => p.in_stock === false && p.name).map((p, i) => {
                            const qty = calcQty(p.drug_type, p.dose_qty, p.frequency, p.duration);
                            return (
                              <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-red-100/50">
                                <span className="font-bold text-gray-800">{p.name}{p.measurement ? ` ${p.measurement}` : ''}</span>
                                <span className="text-gray-500 text-[10px]">{p.drug_type} · Qty needed: {qty > 0 ? qty : 1}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-red-400">These drugs will still be sent to pharmacy — pharmacist will arrange procurement or substitution.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Follow-up (both modes) ── */}
            <div className="border border-white/30 rounded-2xl p-5 bg-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-orange-500" />
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule Follow-up / Review</h4>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" value={followup.date} onChange={e => setFollowup({...followup, date: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Time</label>
                  <input type="time" value={followup.time} onChange={e => setFollowup({...followup, time: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={followup.type} onChange={e => setFollowup({...followup, type: e.target.value})} className={inputCls}>
                    <option value="review">Review</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="consultation">Special Consultation</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-8 py-5 border-t border-white/20 flex-shrink-0">
            {isResultsReady ? (
              <div className="flex justify-end">
                <button onClick={handleFinalize} disabled={submitting}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-10 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-primary-500/25 active:scale-95 transition-all text-sm">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ClipboardList className="w-5 h-5" /> Finalize Consultation & Generate Bill</>}
                </button>
              </div>
            ) : (
              <>
                {/* Await Results confirmation prompt */}
                {awaitingConfirm && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <p className="text-xs font-bold text-amber-800">Patient will be held in waiting while you see other patients. Return when results are ready.</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setAwaitingConfirm(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                      <button onClick={handleAwaitResults} disabled={submitting}
                        className="px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1">
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Confirm — Await Results
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setAwaitingConfirm(true)}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 font-bold rounded-2xl text-sm transition-all"
                  >
                    <FlaskConical className="w-4 h-4" /> Await Lab Results
                  </button>
                  <button onClick={handleComplete} disabled={submitting}
                    className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-10 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-primary-500/25 active:scale-95 transition-all text-sm">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ClipboardList className="w-5 h-5" /> Complete Visit & Generate Bill</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
