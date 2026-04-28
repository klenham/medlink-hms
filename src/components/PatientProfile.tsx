import React, { useEffect, useState } from 'react';
import {
  X, Phone, MapPin, Activity, Pill, FileText,
  Shield, Users, Calendar, CalendarCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { cn } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  patientId: string;
  patient: any;
  onClose: () => void;
  onTakeVitals: (patient: any) => void;
}

const STATUS_COLORS: Record<string, string> = {
  triage: 'bg-orange-100 text-orange-700',
  consultation: 'bg-teal-100 text-teal-700',
  awaiting_results: 'bg-blue-100 text-blue-700',
  results_ready: 'bg-indigo-100 text-indigo-700',
  billing: 'bg-emerald-100 text-emerald-700',
  discharged: 'bg-slate-100 text-slate-500',
  pharmacy: 'bg-purple-100 text-purple-700',
  laboratory: 'bg-indigo-100 text-indigo-700',
};

const dosageLabel = (m: any) => {
  const parts: string[] = [];
  if (m.dosage) parts.push(m.dosage);
  else if (m.drug_type) parts.push(m.drug_type);
  if (m.frequency) parts.push(`${m.frequency}×/day`);
  else if (m.dose_qty) parts.push(`${m.dose_qty}/day`);
  if (m.duration) parts.push(`${m.duration} day${Number(m.duration) !== 1 ? 's' : ''}`);
  return parts.join(' · ') || 'As directed';
};

type Tab = 'overview' | 'history' | 'medications' | 'appointments';

export default function PatientProfile({ patientId, patient: basicPatient, onClose, onTakeVitals }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/profile`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        });
        if (res.ok) setProfile(await res.json());
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [patientId]);

  const pt = profile?.patient || basicPatient;
  const vitalsHistory: any[] = profile?.vitalsHistory || [];
  const consultations: any[] = profile?.consultations || [];
  const prescriptions: any[] = profile?.prescriptions || [];
  const appointments: any[] = profile?.appointments || [];
  const latestVitals = vitalsHistory[0];

  const bpData = vitalsHistory
    .filter(v => v.bp?.includes('/'))
    .slice(0, 8)
    .reverse()
    .map(v => ({
      label: format(new Date(v.createdAt), 'dd MMM'),
      systolic: parseInt(v.bp.split('/')[0]),
      diastolic: parseInt(v.bp.split('/')[1]),
    }));

  const initials = pt?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || 'P';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex overflow-hidden">
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className="ml-auto w-full max-w-5xl bg-white flex flex-col h-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 font-black text-xl">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{pt?.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black text-gray-400 tracking-widest">{pt?.patient_id}</span>
                {pt?.status && (
                  <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', STATUS_COLORS[pt.status] || 'bg-gray-100 text-gray-600')}>
                    {pt.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onClose(); onTakeVitals(pt); }}
              className="flex items-center gap-2 bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-teal-600 transition-all shadow-md shadow-teal-500/20"
            >
              <Activity className="w-3.5 h-3.5" />
              Take Vitals
            </button>
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-72 border-r border-gray-100 overflow-y-auto p-6 space-y-5 bg-surface-50/30 shrink-0">
            {/* Contact */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</h4>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="font-medium text-gray-700">{pt?.phone || '—'}</span>
              </div>
              {pt?.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span className="font-medium text-gray-700">{pt.address}</span>
                </div>
              )}
              {pt?.next_of_kin && (
                <div className="flex items-start gap-3 text-sm">
                  <Users className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[9px] text-gray-400 font-black uppercase mb-0.5">Nearest Relative</div>
                    <div className="font-medium text-gray-700 text-xs">{pt.next_of_kin}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Insurance card */}
            {pt?.nhis_number ? (
              <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                <div className="text-[9px] font-black opacity-70 uppercase tracking-widest mb-2">Medlink Member</div>
                <div className="font-bold text-sm mb-3">{pt.name}</div>
                <div className="text-[9px] opacity-70 uppercase tracking-widest">NHIS / ID</div>
                <div className="font-black tracking-widest text-sm mt-0.5">{pt.nhis_number}</div>
                <div className="text-right mt-3 text-[9px] opacity-50">NHIS INSURED</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-500 rounded-xl px-3 py-2.5 text-xs font-bold">
                <Shield className="w-4 h-4" />
                Private / Self-Paying
              </div>
            )}

            {/* Latest Vitals */}
            {latestVitals && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Latest Vitals</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'BP', value: latestVitals.bp, color: 'text-red-500' },
                    { label: 'Temp', value: latestVitals.temperature ? `${latestVitals.temperature}°C` : null, color: 'text-orange-500' },
                    { label: 'Weight', value: latestVitals.weight ? `${latestVitals.weight} kg` : null, color: 'text-blue-500' },
                    { label: 'Pulse', value: latestVitals.pulse ? `${latestVitals.pulse} bpm` : null, color: 'text-pink-500' },
                    { label: 'SpO2', value: latestVitals.spo2 ? `${latestVitals.spo2}%` : null, color: 'text-teal-600' },
                  ].filter(v => v.value).map(v => (
                    <div key={v.label} className="bg-white rounded-xl p-2.5 border border-gray-100 text-center">
                      <div className="text-[9px] font-black text-gray-400 uppercase">{v.label}</div>
                      <div className={cn('text-xs font-black mt-1', v.color)}>{v.value}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 text-center">
                  {format(new Date(latestVitals.createdAt), 'dd MMM yyyy HH:mm')}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 border-b border-gray-100 shrink-0">
              {(['overview', 'history', 'medications', 'appointments'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all',
                    activeTab === tab
                      ? 'bg-white text-teal-600 border border-b-0 border-gray-200 shadow-sm -mb-px relative z-10'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  {tab === 'history' ? 'Medical History' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                  Loading patient data...
                </div>
              )}

              {/* OVERVIEW */}
              {!loading && activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Demographics</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Age', value: pt?.age ? `${pt.age} years` : '—' },
                        { label: 'Gender', value: pt?.gender || '—' },
                        { label: 'Date of Birth', value: pt?.date_of_birth ? format(new Date(pt.date_of_birth), 'dd MMM yyyy') : '—' },
                        { label: 'Marital Status', value: pt?.marital_status || '—' },
                        { label: 'Occupation', value: pt?.occupation || '—' },
                        { label: 'Religion', value: pt?.religion || '—' },
                      ].map(d => (
                        <div key={d.label} className="bg-surface-50 rounded-xl p-3">
                          <div className="text-[9px] font-black text-gray-400 uppercase mb-1">{d.label}</div>
                          <div className="text-sm font-bold text-gray-700">{d.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {bpData.length > 1 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Blood Pressure History</h3>
                      <div className="bg-white border border-gray-100 rounded-2xl p-4">
                        <Line
                          data={{
                            labels: bpData.map(d => d.label),
                            datasets: [
                              {
                                label: 'Systolic',
                                data: bpData.map(d => d.systolic),
                                borderColor: '#ef4444',
                                backgroundColor: 'rgba(239,68,68,0.07)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#ef4444',
                              },
                              {
                                label: 'Diastolic',
                                data: bpData.map(d => d.diastolic),
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59,130,246,0.07)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#3b82f6',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            plugins: { legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 10 } }, title: { display: false } },
                            scales: {
                              y: { min: 40, max: 200, grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } },
                              x: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } },
                            },
                          }}
                          height={70}
                        />
                      </div>
                    </div>
                  )}

                  {consultations.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Recent Diagnoses</h3>
                      <div className="space-y-2">
                        {consultations.slice(0, 3).map((c: any) => (
                          <div key={c._id} className="flex items-start gap-3 bg-surface-50 rounded-xl p-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm font-bold text-gray-800">{c.illness || 'General Consultation'}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {c.doctor?.name} • {format(new Date(c.createdAt), 'dd MMM yyyy')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MEDICAL HISTORY */}
              {!loading && activeTab === 'history' && (
                <div className="space-y-3">
                  {consultations.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm">No consultation history yet.</div>
                  ) : consultations.map((c: any) => (
                    <div key={c._id} className="border border-gray-100 rounded-2xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                          <span className="font-bold text-gray-900 text-sm">{c.illness || 'General Consultation'}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full',
                            c.status === 'complete' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          )}>{c.status?.toUpperCase()}</span>
                          <span className="text-[10px] text-gray-400">{format(new Date(c.createdAt), 'dd MMM yyyy')}</span>
                        </div>
                      </div>
                      {c.doctor?.name && <div className="text-[10px] font-bold text-gray-400 pl-6">{c.doctor.name}</div>}
                      {c.treatment && (
                        <div className="text-xs text-gray-600 pl-6">
                          <span className="font-bold">Treatment: </span>{c.treatment}
                        </div>
                      )}
                      {c.notes && <div className="text-xs text-gray-500 pl-6">{c.notes}</div>}
                      {(c.addendum_diagnosis || c.addendum_notes) && (
                        <div className="ml-6 mt-2 pt-2 border-t border-gray-50">
                          <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Addendum</div>
                          {c.addendum_diagnosis && <div className="text-xs font-bold text-gray-700">{c.addendum_diagnosis}</div>}
                          {c.addendum_plan && <div className="text-xs text-gray-500 mt-0.5">{c.addendum_plan}</div>}
                          {c.addendum_notes && <div className="text-xs text-gray-500 mt-0.5">{c.addendum_notes}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* MEDICATIONS */}
              {!loading && activeTab === 'medications' && (
                <div className="space-y-4">
                  {prescriptions.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm">No prescription records.</div>
                  ) : prescriptions.map((rx: any) => (
                    <div key={rx._id} className="border border-gray-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-bold text-gray-600">{rx.doctor?.name}</span>
                          <span className="text-[10px] text-gray-400">• {format(new Date(rx.createdAt), 'dd MMM yyyy')}</span>
                        </div>
                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full',
                          rx.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          rx.status === 'ready' ? 'bg-teal-50 text-teal-600' :
                          'bg-slate-50 text-slate-500'
                        )}>{rx.status?.toUpperCase()}</span>
                      </div>
                      {rx.medications?.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[9px] text-gray-400 font-black uppercase border-b border-gray-50">
                              <th className="text-left pb-2">Medication</th>
                              <th className="text-left pb-2">Dosage</th>
                              <th className="text-left pb-2">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {rx.medications.map((m: any, i: number) => (
                              <tr key={i}>
                                <td className="py-2 font-bold text-gray-800">
                                  {m.drug_name || m.name}
                                  {m.instructions && <div className="text-[9px] text-gray-400 italic font-normal mt-0.5">{m.instructions}</div>}
                                </td>
                                <td className="py-2 text-gray-500">{dosageLabel(m)}</td>
                                <td className="py-2 text-gray-600">{m.quantity || m.qty || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-[10px] text-gray-400 italic">No medication details available.</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* APPOINTMENTS */}
              {!loading && activeTab === 'appointments' && (
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm">No appointments found.</div>
                  ) : appointments.map((a: any) => (
                    <div key={a._id} className="flex items-start gap-4 border border-gray-100 rounded-2xl p-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex flex-col items-center justify-center text-teal-600 shrink-0">
                        <div className="text-lg font-black leading-tight">{format(new Date(a.date), 'd')}</div>
                        <div className="text-[9px] font-bold uppercase">{format(new Date(a.date), 'MMM')}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-gray-900 text-sm capitalize">{a.type || 'Appointment'}</div>
                          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full shrink-0',
                            a.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                            a.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-red-50 text-red-500'
                          )}>{a.status?.toUpperCase()}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {a.time} • {a.doctor?.name || 'TBD'} • {format(new Date(a.date), 'EEEE, dd MMM yyyy')}
                        </div>
                        {a.notes && <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">{a.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
