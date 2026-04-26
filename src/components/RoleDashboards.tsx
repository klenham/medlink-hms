import { useEffect, useState, useMemo } from 'react';
// RoleDashboards — Lab, Pharmacy, Accounts, Nurse station views
import { FlaskConical, Pill, Wallet, CheckCircle2, CreditCard, Banknote, Loader2, History, TrendingUp, CalendarCheck, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, formatDistanceToNow, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { toast } from 'sonner';
import HospitalUpdates from './HospitalUpdates';
import Patients from '../pages/Patients';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

type PendingGroup = {
  patientId: string;
  patientName: string;
  patientPid: string;
  tests: any[];
  requestedAt: string;
};

// --- LAB TECHNICIAN ---
export function LabDashboard() {
  const [list, setList] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<PendingGroup[]>([]);
  const [selected, setSelected] = useState<PendingGroup | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'analytics' | 'history'>('queue');
  const token = () => sessionStorage.getItem('token') ?? '';

  useEffect(() => {
    fetchPending();
    fetchHistory();
  }, []);

  // Group individual pending requests by patient
  useEffect(() => {
    const map = new Map<string, PendingGroup>();
    list.forEach(req => {
      const pid = (req.patient as any)?._id?.toString() ?? req.patient_name ?? 'unknown';
      if (!map.has(pid)) {
        map.set(pid, {
          patientId: pid,
          patientName: req.patient_name ?? 'Unknown',
          patientPid: (req.patient as any)?.patient_id ?? req.patient_pid ?? '',
          tests: [],
          requestedAt: req.createdAt,
        });
      }
      map.get(pid)!.tests.push(req);
    });
    setGrouped(Array.from(map.values()));
  }, [list]);

  const fetchPending = async () => {
    const res = await fetch('/api/stations/pending', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (Array.isArray(data)) setList(data);
  };

  const fetchHistory = async () => {
    const res = await fetch('/api/stations/lab/history', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (Array.isArray(data)) setHistory(data);
  };

  const openModal = (group: PendingGroup) => {
    setSelected(group);
    const initial: Record<string, string> = {};
    group.tests.forEach(t => { initial[t.id] = ''; });
    setResults(initial);
  };

  const submitResults = async () => {
    if (!selected) return;
    const toSubmit = selected.tests.filter(t => results[t.id]?.trim());
    if (!toSubmit.length) { toast.error('Please enter at least one result'); return; }
    setLoading(true);
    let success = 0;
    for (const test of toSubmit) {
      try {
        const r = await fetch(`/api/stations/${test.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ result: results[test.id] }),
        });
        if (r.ok) success++;
      } catch { /* continue submitting remaining */ }
    }
    setLoading(false);
    if (success > 0) {
      toast.success(`${success} result(s) submitted`, { description: `Patient: ${selected.patientName}` });
      setSelected(null);
      setResults({});
      fetchPending();
      fetchHistory();
    } else {
      toast.error('Failed to record results — please try again');
    }
  };

  // Chart computations
  const testTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => { counts[h.test_type] = (counts[h.test_type] || 0) + 1; });
    return counts;
  }, [history]);

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const day = d.toISOString().split('T')[0];
    return { label: format(d, 'EEE d'), count: history.filter(h => h.completed_at?.startsWith(day)).length };
  }), [history]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = history.filter(h => h.completed_at?.startsWith(todayStr)).length;

  const CHART_COLORS = ['#0d9488', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#d97706', '#6b7280'];

  const doughnutData = {
    labels: Object.keys(testTypeDistribution),
    datasets: [{
      data: Object.values(testTypeDistribution),
      backgroundColor: CHART_COLORS,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const barData = {
    labels: last7Days.map(d => d.label),
    datasets: [{
      label: 'Completed Tests',
      data: last7Days.map(d => d.count),
      backgroundColor: '#0d9488',
      hoverBackgroundColor: '#0f766e',
      borderRadius: 10,
    }],
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Laboratory Station</h1>
          <p className="text-slate-500 text-sm">Process diagnostic requests and record results.</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Patients', value: grouped.length, color: 'text-amber-600' },
            { label: 'Tests Pending', value: list.length, color: 'text-teal-600' },
            { label: 'Done Today', value: todayCount, color: 'text-slate-800' },
          ].map(s => (
            <div key={s.label} className="glass px-5 py-3 rounded-2xl text-center min-w-[80px]">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{s.label}</div>
              <div className={cn('text-xl font-bold', s.color)}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-2 mb-8">
        {(['queue', 'analytics', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
              activeTab === tab
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                : 'glass text-slate-500 hover:text-slate-700')}>
            {tab === 'queue'
              ? `Queue (${grouped.length})`
              : tab === 'analytics'
              ? 'Analytics'
              : `History (${history.length})`}
          </button>
        ))}
      </div>

      {/* ── QUEUE ── */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.length === 0 && (
            <div className="col-span-3 text-center py-16 glass rounded-3xl">
              <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No pending lab requests</p>
            </div>
          )}
          {grouped.map(group => (
            <motion.div key={group.patientId} layout onClick={() => openModal(group)}
              className="glass p-6 rounded-3xl hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{group.patientName}</h3>
                  <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{group.patientPid}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <FlaskConical className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {group.tests.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">{t.test_type}</span>
                    {t.notes && (
                      <span className="text-[10px] text-slate-400 truncate ml-auto shrink-0 max-w-[40%]">
                        {t.notes}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {formatDistanceToNow(new Date(group.requestedAt), { addSuffix: true })}
                </span>
                <span className="px-3 py-1.5 bg-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-teal-600 transition-colors shadow-md shadow-teal-500/20">
                  Enter Results
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {history.length === 0 ? (
            <div className="text-center py-16 glass rounded-3xl">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No completed tests yet — analytics will appear here</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Completed', value: history.length, color: 'text-teal-600' },
                  { label: 'Test Types', value: Object.keys(testTypeDistribution).length, color: 'text-slate-800' },
                  { label: 'This Week', value: last7Days.reduce((s, d) => s + d.count, 0), color: 'text-violet-600' },
                  { label: 'Today', value: todayCount, color: 'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="glass p-5 rounded-2xl text-center">
                    <div className={cn('text-2xl font-black mb-1', s.color)}>{s.value}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-3xl">
                  <h3 className="font-bold text-slate-800 text-base mb-0.5">7-Day Activity</h3>
                  <p className="text-xs text-slate-400 mb-5">Tests completed over the past week</p>
                  <Bar data={barData} options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
                      x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                    },
                  }} />
                </div>

                <div className="glass p-6 rounded-3xl">
                  <h3 className="font-bold text-slate-800 text-base mb-0.5">Test Distribution</h3>
                  <p className="text-xs text-slate-400 mb-5">All-time breakdown by test type</p>
                  <div className="flex justify-center">
                    <div style={{ maxWidth: 280 }} className="w-full">
                      <Doughnut data={doughnutData} options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { padding: 16, font: { size: 11 }, color: '#475569' },
                          },
                        },
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'history' && (
        <div className="glass rounded-3xl overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No completed tests yet</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-white/20">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Test Type</th>
                  <th className="px-6 py-4">Result</th>
                  <th className="px-6 py-4">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{h.patient_name}</p>
                      <p className="text-[10px] text-teal-600 font-black uppercase">{h.patient_pid}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg">{h.test_type}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-slate-600 line-clamp-2">{h.result || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {h.completed_at ? format(new Date(h.completed_at), 'dd MMM yy · HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── RESULT ENTRY MODAL ── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[80] flex items-start justify-center p-6 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8">

              {/* Modal header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-8 py-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-4 h-4 opacity-70" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Laboratory Results Entry</span>
                </div>
                <h2 className="text-2xl font-bold">{selected.patientName}</h2>
                <p className="text-teal-100 text-sm font-medium mt-0.5">
                  {selected.patientPid} · {selected.tests.length} test{selected.tests.length !== 1 ? 's' : ''} pending
                </p>
              </div>

              {/* Per-test result cards */}
              <div className="px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {selected.tests.map((test, idx) => (
                  <div key={test.id}
                    className="border-2 border-slate-100 hover:border-teal-200 rounded-2xl overflow-hidden transition-colors">
                    <div className="bg-slate-50 px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-black text-teal-700">{idx + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{test.test_type}</p>
                          {test.notes && (
                            <p className="text-[10px] text-slate-500 italic">Doctor's note: {test.notes}</p>
                          )}
                        </div>
                      </div>
                      {results[test.id]?.trim() && (
                        <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="px-5 pt-4 pb-5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Findings / Result
                      </label>
                      <textarea
                        value={results[test.id] || ''}
                        onChange={e => setResults(r => ({ ...r, [test.id]: e.target.value }))}
                        rows={3}
                        placeholder={`Enter ${test.test_type} findings here…`}
                        className="w-full border-2 border-slate-200 focus:border-teal-400 rounded-xl p-3.5 text-slate-800 text-sm font-medium outline-none transition-colors resize-none bg-white placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  onClick={() => { setSelected(null); setResults({}); }}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm">
                  Cancel
                </button>
                <button
                  onClick={submitResults}
                  disabled={loading}
                  className="flex-[2] py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 transition-colors">
                  {loading
                    ? <Loader2 className="animate-spin w-4 h-4" />
                    : <><CheckCircle2 className="w-4 h-4" /> Submit Results</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <HospitalUpdates user={{ role: 'lab_technician' }} />
    </div>
  );
}

// --- PHARMACIST ---
export function PharmacyDashboard() {
  const [list, setList] = useState<any[]>([]);
  const [fulfilledCount, setFulfilledCount] = useState(0);
  const token = () => sessionStorage.getItem('token') ?? '';

  useEffect(() => {
    fetchPending();
    fetch('/api/stations/pharmacy/served', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setFulfilledCount(d.length); }).catch(() => {});
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchPending = async () => {
    const res = await fetch('/api/stations/pharmacy/pending', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (Array.isArray(data)) setList(data);
  };

  const markReady = async (id: string) => {
    const res = await fetch(`/api/stations/pharmacy/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) {
      toast.success('Prescription ready for collection');
      setFulfilledCount(c => c + 1);
      fetchPending();
    } else {
      toast.error('Failed to update status');
    }
  };

  const dosageLabel = (m: any) => {
    const parts: string[] = [];
    if (m.drug_type) parts.push(m.drug_type);
    if (m.dose_qty && m.frequency) parts.push(`${m.dose_qty} × ${m.frequency}×/day`);
    if (m.duration) parts.push(`${m.duration} day${Number(m.duration) !== 1 ? 's' : ''}`);
    return parts.join(' · ') || 'As directed';
  };

  const effectiveQty = (m: any) =>
    m.qty > 0 ? m.qty : (parseInt(m.dose_qty || '1') * parseInt(m.frequency || '1') * parseInt(m.duration || '1')) || 1;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pharmacy Station</h1>
          <p className="text-slate-500 text-sm">Real-time prescription fulfillment desk.</p>
        </div>
        <div className="flex gap-4">
          <div className="glass px-6 py-3 rounded-2xl text-center">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Pending</div>
            <div className="text-xl font-bold text-teal-600">{list.length}</div>
          </div>
          <div className="glass px-6 py-3 rounded-2xl text-center">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Fulfilled</div>
            <div className="text-xl font-bold text-slate-800">{fulfilledCount}</div>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl">
          <Pill className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-lg">No pending prescriptions</p>
          <p className="text-slate-300 text-sm mt-1">Prescriptions sent by doctors will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {list.map(pres => {
            const meds: any[] = Array.isArray(pres.medications) ? pres.medications : [];
            return (
              <div key={pres.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Card header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{pres.patient_name}</h3>
                      <p className="text-[10px] text-teal-100 font-bold uppercase tracking-wide">
                        Dr. {pres.doctor_name} · {format(new Date(pres.createdAt || Date.now()), 'HH:mm dd MMM')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-white/70 bg-white/10 px-2.5 py-1 rounded-lg">
                    {meds.length} drug{meds.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Medications */}
                <div className="px-6 py-4 space-y-3">
                  {meds.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">No medication details</p>
                  ) : (
                    meds.map((m: any, i: number) => (
                      <div key={i} className="flex items-start justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">
                            {m.name}{m.measurement ? ` ${m.measurement}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{dosageLabel(m)}</p>
                        </div>
                        <div className="ml-3 text-right flex-shrink-0">
                          <span className="text-xs font-black text-teal-600">Qty: {effectiveQty(m)}</span>
                          {m.in_stock === false && (
                            <p className="text-[9px] font-bold text-red-500 uppercase">Out of stock</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Action */}
                <div className="px-6 pb-5">
                  <button onClick={() => markReady(pres.id)}
                    className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Prepare & Mark Ready for Collection
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HospitalUpdates user={{ role: 'pharmacist' }} />
    </div>
  );
}

// --- ACCOUNTS / CASHIER ---
export function AccountsDashboard() {
  const [pending, setPending] = useState<any[]>([]);
  const [paidBills, setPaidBills] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [receiptBill, setReceiptBill] = useState<any>(null);
  const [method, setMethod] = useState<'Cash' | 'MoMo'>('Cash');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'analytics'>('pending');
  const token = () => sessionStorage.getItem('token') ?? '';

  useEffect(() => {
    fetchPending();
    fetchPaid();
  }, []);

  const fetchPending = async () => {
    const res = await fetch('/api/stations/billing/pending', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (Array.isArray(data)) setPending(data);
  };

  const fetchPaid = async () => {
    const res = await fetch('/api/stations/billing/paid', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (Array.isArray(data)) setPaidBills(data);
  };

  const recordPayment = async () => {
    setLoading(true);
    const res = await fetch(`/api/stations/billing/pay/${selected.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ method }),
    });
    setLoading(false);
    if (res.ok) {
      const paid = { ...selected, payment_method: method, paid_at: new Date().toISOString() };
      setSelected(null);
      setReceiptBill(paid);
      fetchPending();
      fetchPaid();
    } else {
      toast.error('Failed to process payment');
    }
  };

  const printReceipt = (bill: any) => {
    const win = window.open('', '_blank', 'width=420,height=650');
    if (!win) { toast.error('Allow popups to print receipts'); return; }
    const itemsHtml = (bill.items || [])
      .map((item: any) => `<div class="row"><span>${item.name || 'Service'}</span><span>&#8373;${(item.price || 0).toFixed(2)}</span></div>`)
      .join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;padding:24px;max-width:380px;margin:0 auto;color:#1e293b;font-size:13px}
      .center{text-align:center}
      h1{font-size:20px;font-weight:900;letter-spacing:2px}
      .sub{font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:1px}
      .divider{border:none;border-top:1px dashed #cbd5e1;margin:12px 0}
      .row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}
      .row span:last-child{font-weight:700}
      .total{font-size:16px;font-weight:900;padding:6px 0}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
      .footer{font-size:10px;color:#94a3b8;margin-top:16px}
      @media print{.no-print{display:none!important}}
    </style></head><body>
    <div class="center">
      <h1>MEDLINK HMS</h1>
      <p class="sub">Official Payment Receipt</p>
    </div>
    <hr class="divider"/>
    <div class="row"><span>Patient</span><span>${bill.patient_name || ''}</span></div>
    <div class="row"><span>Receipt No.</span><span>${(bill.id || '').substring(0,8).toUpperCase()}</span></div>
    <div class="row"><span>Date</span><span>${format(new Date(bill.paid_at || Date.now()), 'dd MMM yyyy HH:mm')}</span></div>
    <div class="row"><span>Method</span><span>${bill.payment_method || method}</span></div>
    <hr class="divider"/>
    <p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:6px">Items</p>
    ${itemsHtml || '<div class="row"><span>Consultation & Services</span><span>&#8373;' + (bill.total || 0).toFixed(2) + '</span></div>'}
    <hr class="divider"/>
    <div class="row total"><span>TOTAL PAID</span><span>&#8373;${(bill.total || 0).toFixed(2)}</span></div>
    <div style="text-align:center;margin-top:10px"><span class="badge">PAID</span></div>
    <div class="center footer" style="margin-top:20px">
      <p>Thank you for visiting MedLink HMS</p>
      <p>Keep this receipt for your records</p>
    </div>
    <div class="no-print" style="text-align:center;margin-top:20px">
      <button onclick="window.print()" style="padding:10px 28px;background:#0d9488;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
        Print Receipt
      </button>
    </div>
    </body></html>`);
    win.document.close();
    win.focus();
  };

  // Analytics computations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRevenue = paidBills.filter(b => (b.paid_at || '').startsWith(todayStr)).reduce((s, b) => s + (b.total || 0), 0);
  const totalRevenue = paidBills.reduce((s, b) => s + (b.total || 0), 0);
  const cashCount = paidBills.filter(b => b.payment_method === 'Cash').length;
  const momoCount = paidBills.filter(b => b.payment_method === 'MoMo').length;

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const day = d.toISOString().split('T')[0];
    return {
      label: format(d, 'EEE d'),
      revenue: paidBills.filter(b => (b.paid_at || '').startsWith(day)).reduce((s, b) => s + (b.total || 0), 0),
      count: paidBills.filter(b => (b.paid_at || '').startsWith(day)).length,
    };
  }), [paidBills]);

  const revenueBarData = {
    labels: last7Days.map(d => d.label),
    datasets: [{
      label: 'Revenue (₵)',
      data: last7Days.map(d => d.revenue),
      backgroundColor: '#0d9488',
      hoverBackgroundColor: '#0f766e',
      borderRadius: 10,
    }],
  };

  const methodDoughnutData = {
    labels: ['Cash', 'Mobile Money'],
    datasets: [{
      data: [cashCount || 0, momoCount || 0],
      backgroundColor: ['#0d9488', '#6366f1'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Billing & Collections</h1>
          <p className="text-slate-500 text-sm">Manage payment receipts and hospital accounts.</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Unpaid', value: pending.length, color: 'text-orange-600' },
            { label: 'Today Revenue', value: `₵${todayRevenue.toFixed(2)}`, color: 'text-teal-600' },
            { label: 'Total Collected', value: `₵${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-slate-800' },
          ].map(s => (
            <div key={s.label} className="glass px-5 py-3 rounded-2xl text-center min-w-[90px]">
              <div className={cn('text-lg font-bold', s.color)}>{s.value}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {(['pending', 'history', 'analytics'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
              activeTab === tab ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' : 'glass text-slate-500 hover:text-slate-700')}>
            {tab === 'pending' ? `Unpaid (${pending.length})` : tab === 'history' ? `History (${paidBills.length})` : 'Analytics'}
          </button>
        ))}
      </div>

      {/* ── PENDING ── */}
      {activeTab === 'pending' && (
        <div className="glass overflow-hidden rounded-3xl">
          {pending.length === 0 ? (
            <div className="text-center py-16">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No pending bills</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-white/20">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Patient</th>
                  <th className="px-8 py-5">Bill ID</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Issued</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pending.map(bill => (
                  <tr key={bill.id} className="hover:bg-white/40 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-800">{bill.patient_name}</td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-400">{bill.id.substring(0, 8).toUpperCase()}</td>
                    <td className="px-8 py-5 font-bold text-teal-600">₵{bill.total.toFixed(2)}</td>
                    <td className="px-8 py-5 text-xs text-slate-400">{format(new Date(bill.issued_date), 'dd MMM yyyy')}</td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => { setSelected(bill); setMethod('Cash'); }}
                        className="px-5 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">
                        Receive Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'history' && (
        <div className="glass rounded-3xl overflow-hidden">
          {paidBills.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No payment history yet</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-white/20">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Paid</th>
                  <th className="px-6 py-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {paidBills.map(bill => (
                  <tr key={bill.id} className="hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{bill.patient_name}</p>
                      <p className="text-[10px] text-teal-600 font-black uppercase">{bill.patient_pid}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-teal-600">₵{(bill.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={cn('text-[10px] font-black uppercase px-2.5 py-1 rounded-lg',
                        bill.payment_method === 'MoMo' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-700')}>
                        {bill.payment_method || 'Cash'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {bill.paid_at ? format(new Date(bill.paid_at), 'dd MMM yy · HH:mm') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => printReceipt(bill)}
                        className="px-4 py-1.5 glass text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Transactions', value: paidBills.length, color: 'text-teal-600' },
              { label: 'Total Revenue', value: `₵${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'text-slate-800' },
              { label: 'Cash Payments', value: cashCount, color: 'text-teal-600' },
              { label: 'MoMo Payments', value: momoCount, color: 'text-indigo-600' },
            ].map(s => (
              <div key={s.label} className="glass p-5 rounded-2xl text-center">
                <div className={cn('text-2xl font-black mb-1', s.color)}>{s.value}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
          {paidBills.length === 0 ? (
            <div className="text-center py-16 glass rounded-3xl">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Analytics will appear after first payment is processed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-3xl">
                <h3 className="font-bold text-slate-800 text-base mb-0.5">7-Day Revenue</h3>
                <p className="text-xs text-slate-400 mb-5">Daily collections over the past week</p>
                <Bar data={revenueBarData} options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { color: '#94a3b8', callback: (v: any) => `₵${v}` }, grid: { color: '#f1f5f9' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                  },
                }} />
              </div>
              <div className="glass p-6 rounded-3xl">
                <h3 className="font-bold text-slate-800 text-base mb-0.5">Payment Methods</h3>
                <p className="text-xs text-slate-400 mb-5">Cash vs Mobile Money breakdown</p>
                <div className="flex justify-center">
                  <div style={{ maxWidth: 280 }} className="w-full">
                    <Doughnut data={methodDoughnutData} options={{
                      responsive: true,
                      plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 11 }, color: '#475569' } } },
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENT MODAL ── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Process Payment</p>
                <h2 className="text-2xl font-bold">{selected.patient_name}</h2>
              </div>
              <div className="px-8 py-6">
                <div className="p-6 bg-slate-50 rounded-2xl mb-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payable</p>
                  <h3 className="text-4xl font-black text-slate-800">₵{selected.total.toFixed(2)}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {(['Cash', 'MoMo'] as const).map(m => (
                    <button key={m} onClick={() => setMethod(m)}
                      className={cn('p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border-2',
                        method === m ? 'bg-teal-500 border-teal-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-teal-300')}>
                      {m === 'Cash' ? <Banknote className="w-8 h-8" /> : <CreditCard className="w-8 h-8" />}
                      <span className="text-[10px] font-black uppercase">{m === 'MoMo' ? 'Mobile Money' : 'Cash'}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelected(null)} className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                  <button onClick={recordPayment} disabled={loading}
                    className="flex-[2] py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Wallet className="w-5 h-5" /> Complete Payment</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── RECEIPT MODAL (shown after payment) ── */}
      <AnimatePresence>
        {receiptBill && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-teal-600 to-teal-500 px-8 py-8 text-white text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-90" />
                <h2 className="text-xl font-black uppercase tracking-widest">Payment Complete</h2>
                <p className="text-4xl font-black mt-2">₵{receiptBill.total.toFixed(2)}</p>
                <p className="text-teal-100 text-sm mt-1">{receiptBill.patient_name}</p>
              </div>
              <div className="px-8 py-5 space-y-2.5">
                {[
                  { label: 'Receipt No.', value: receiptBill.id?.substring(0, 8).toUpperCase() },
                  { label: 'Method', value: receiptBill.payment_method },
                  { label: 'Date', value: format(new Date(), 'dd MMM yyyy · HH:mm') },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">{r.label}</span>
                    <span className="font-bold text-slate-800">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="px-8 pb-6 flex gap-3">
                <button onClick={() => setReceiptBill(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">
                  Close
                </button>
                <button onClick={() => printReceipt(receiptBill)}
                  className="flex-[2] py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
                  <Wallet className="w-4 h-4" /> Print Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <HospitalUpdates user={{ role: 'accounts' }} />
    </div>
  );
}

// --- NURSE ---
export function NurseDashboard() {
  const [activeTab, setActiveTab] = useState<'patients' | 'schedule'>('patients');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [calMonth, setCalMonth] = useState(new Date());
  const token = () => sessionStorage.getItem('token') ?? '';

  useEffect(() => {
    if (activeTab === 'schedule') fetchAppointments();
  }, [activeTab]);

  const fetchAppointments = async () => {
    const res = await fetch('/api/admin/appointments', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (Array.isArray(data)) setAppointments(data);
  };

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
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {(['patients', 'schedule'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
              activeTab === tab
                ? tab === 'patients'
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                  : 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                : 'glass text-slate-500 hover:text-slate-700')}>
            {tab === 'patients' ? <><Users className="w-3.5 h-3.5" /> Patients</> : <><CalendarCheck className="w-3.5 h-3.5" /> Schedule</>}
          </button>
        ))}
      </div>

      {activeTab === 'patients' && <Patients />}

      {activeTab === 'schedule' && (
        <div className="max-w-7xl mx-auto pb-12">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Appointment Schedule</h1>
              <p className="text-slate-500 text-sm">All upcoming patient appointments across all doctors.</p>
            </div>
            <div className="flex gap-3">
              {[
                { label: 'Today', value: todayCount, color: 'text-teal-600' },
                { label: 'Upcoming', value: upcoming.length, color: 'text-violet-600' },
              ].map(s => (
                <div key={s.label} className="glass px-5 py-3 rounded-2xl text-center min-w-[80px]">
                  <div className={cn('text-xl font-bold', s.color)}>{s.value}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="glass p-5 rounded-3xl self-start">
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

            {/* Appointments list */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">All Upcoming</h3>
              {upcoming.length === 0 ? (
                <div className="text-center py-14 glass rounded-3xl">
                  <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No upcoming appointments</p>
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
                      <p className="text-[10px] text-teal-600 font-black uppercase">{appt.doctor_name}</p>
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
        </div>
      )}
    </div>
  );
}
