import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  Phone,
  ArrowRight,
  Activity,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import MedicalHistory from '../components/MedicalHistory';
import HospitalUpdates from '../components/HospitalUpdates';
import CCCAlerts from '../components/CCCAlerts';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';

const RELIGIONS = ['Christianity', 'Islam', 'Traditional', 'Catholic', 'Seventh-day Adventist', 'Pentecostal', 'Other'];

const defaultPatient = {
  surname: '', other_names: '', date_of_birth: '', gender: 'Male',
  phone: '', marital_status: 'Single', religion: '', occupation: '',
  address: '', nhis_number: '', next_of_kin: '',
  next_of_kin_name: '', next_of_kin_phone: '',
};

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [newPatient, setNewPatient] = useState(defaultPatient);
  const [nhisMode, setNhisMode] = useState<'none' | 'active' | 'inactive'>('none');

  const [vitals, setVitals] = useState({
    bp: '', temperature: '', weight: '', pulse: '', spo2: '', ccc: '', ccc_status: 'generated'
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients?limit=50', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : (data.patients || []));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...newPatient,
        nhis_number: nhisMode === 'none' ? '' : newPatient.nhis_number,
        next_of_kin: [newPatient.next_of_kin_name, newPatient.next_of_kin_phone].filter(Boolean).join(' — '),
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Patient registered successfully');
      setShowRegModal(false);
      setNewPatient(defaultPatient);
      setNhisMode('none');
      fetchPatients();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVitals = async (e: React.FormEvent) => {
    e.preventDefault();

    if (showVitalsModal.nhis_number && vitals.ccc_status === 'generated') {
      if (!vitals.ccc || vitals.ccc.length !== 5) {
        return toast.error('CCC must be a 5-digit number for NHIS patients');
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/history/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          patient_id: showVitalsModal._id || showVitalsModal.id,
          ...vitals,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Vitals recorded and referred to doctor');
      setShowVitalsModal(null);
      setVitals({ bp: '', temperature: '', weight: '', pulse: '', spo2: '', ccc: '', ccc_status: 'generated' });
      fetchPatients();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    const name = p.name || '';
    const pid = p.patient_id || p._id || p.id || '';
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pid.toLowerCase().includes(searchTerm.toLowerCase());
    const currentStatus = p.status ? p.status.toLowerCase() : 'triage';
    const matchesStatus = statusFilter === 'All' || statusFilter === 'All Status' || currentStatus === statusFilter.toLowerCase();
    const matchesDate = !dateFilter || (p.created_at && p.created_at.startsWith(dateFilter));
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nurse Station</h1>
          <p className="text-sm text-gray-500 mt-1">Register patients and record vitals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-gray-100 p-3 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all shadow-sm">
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowRegModal(true)}
            className="bg-primary-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
          >
            <Plus className="w-5 h-5" />
            Register New Patient
          </button>
        </div>
      </div>

      <CCCAlerts />

      <div className="glass-card">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search patients by name or ID..."
              className="w-full bg-surface-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-100 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface-50 border border-gray-100 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 outline-none focus:ring-4 focus:ring-primary-500/10 transition-all cursor-pointer"
            >
              <option>All Status</option>
              <option>Triage</option>
              <option>Consultation</option>
              <option>Laboratory</option>
              <option>Pharmacy</option>
              <option>Billing</option>
              <option>Discharged</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-surface-50 border border-gray-100 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 outline-none focus:ring-4 focus:ring-primary-500/10 transition-all cursor-pointer"
            />

            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('All'); setDateFilter(''); }}
              className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50 bg-surface-50/30">
                <th className="px-8 py-5">PATIENT DETAILS</th>
                <th className="px-8 py-5">STATUS</th>
                <th className="px-8 py-5">LAST VISIT</th>
                <th className="px-8 py-5">CONTACT</th>
                <th className="px-8 py-5">GENDER</th>
                <th className="px-8 py-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center text-gray-400">Loading patients...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-medium">
                    No patients found. Register your first patient!
                  </td>
                </tr>
              ) : filteredPatients.map((patient) => (
                <tr key={patient._id || patient.id} className="hover:bg-primary-50/20 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name || 'P')}&background=effafa&color=46a2a2`} alt="" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{patient.name}</div>
                        <div className="text-[10px] font-bold text-gray-400">
                          {patient.patient_id || (patient._id || patient.id || '').toString().slice(-6).toUpperCase()} • {patient.age}Y
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      'px-3 py-1.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 shadow-sm',
                      patient.status === 'triage' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                      patient.status === 'consultation' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                      patient.status === 'laboratory' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                      patient.status === 'pharmacy' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                      patient.status === 'billing' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      'bg-slate-50 text-slate-600 border border-slate-100'
                    )}>
                      <div className={cn('w-1.5 h-1.5 rounded-full',
                        patient.status === 'triage' ? 'bg-orange-500' :
                        patient.status === 'consultation' ? 'bg-teal-500' :
                        patient.status === 'laboratory' ? 'bg-indigo-500' :
                        patient.status === 'pharmacy' ? 'bg-purple-500' :
                        patient.status === 'billing' ? 'bg-emerald-500' :
                        'bg-slate-500'
                      )}></div>
                      {patient.status ? patient.status.toUpperCase() : 'TRIAGE'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-bold text-gray-700">{format(new Date(patient.created_at || Date.now()), 'dd MMM yyyy')}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{format(new Date(patient.created_at || Date.now()), 'HH:mm')}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-primary-500" />
                      {patient.phone}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-bold text-gray-600">{patient.gender}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {patient.status === 'triage' || !patient.status ? (
                        <button
                          onClick={() => { setShowVitalsModal(patient); setVitals({ bp: '', temperature: '', weight: '', pulse: '', spo2: '', ccc: '', ccc_status: 'generated' }); }}
                          className="flex items-center gap-2 bg-teal-500 text-white font-bold text-[10px] px-3 py-2 rounded-lg hover:bg-teal-600 transition-all shadow-md shadow-teal-500/20"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          REFER TO DOCTOR
                        </button>
                      ) : (
                        <span className={cn(
                          'flex items-center gap-1.5 text-[10px] font-black px-3 py-2 rounded-lg',
                          patient.status === 'consultation' ? 'bg-teal-50 text-teal-600' :
                          patient.status === 'laboratory'   ? 'bg-indigo-50 text-indigo-600' :
                          patient.status === 'pharmacy'     ? 'bg-purple-50 text-purple-600' :
                          patient.status === 'billing'      ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-50 text-slate-500'
                        )}>
                          <Activity className="w-3.5 h-3.5" />
                          {patient.status === 'consultation' ? 'WITH DOCTOR' :
                           patient.status === 'laboratory'   ? 'IN LAB' :
                           patient.status === 'pharmacy'     ? 'IN PHARMACY' :
                           patient.status === 'billing'      ? 'AT BILLING' :
                           patient.status === 'discharged'   ? 'DISCHARGED' :
                           patient.status.toUpperCase()}
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedPatient(patient)}
                        className="p-2 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-all"
                        title="View Medical History"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <HospitalUpdates user={{ role: 'nurse' }} />

      <AnimatePresence>
        {showRegModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6">Patient Registration</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Surname</label>
                    <input
                      type="text" required value={newPatient.surname}
                      onChange={e => setNewPatient({ ...newPatient, surname: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                      placeholder="Family name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Other Names</label>
                    <input
                      type="text" required value={newPatient.other_names}
                      onChange={e => setNewPatient({ ...newPatient, other_names: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                      placeholder="First / middle names"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Date of Birth</label>
                    <input
                      type="date" required value={newPatient.date_of_birth}
                      onChange={e => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Gender</label>
                    <select
                      value={newPatient.gender}
                      onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    >
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Marital Status</label>
                    <select
                      value={newPatient.marital_status}
                      onChange={e => setNewPatient({ ...newPatient, marital_status: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    >
                      <option>Single</option>
                      <option>Married</option>
                      <option>Divorced</option>
                      <option>Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Religion</label>
                    <select
                      value={newPatient.religion}
                      onChange={e => setNewPatient({ ...newPatient, religion: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    >
                      <option value="">— Select —</option>
                      {RELIGIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="tel" required value={newPatient.phone}
                    onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    placeholder="0XX XXX XXXX"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Occupation</label>
                  <input
                    type="text" value={newPatient.occupation}
                    onChange={e => setNewPatient({ ...newPatient, occupation: e.target.value })}
                    className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    placeholder="e.g. Teacher, Trader..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Address</label>
                  <input
                    type="text" value={newPatient.address}
                    onChange={e => setNewPatient({ ...newPatient, address: e.target.value })}
                    className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    placeholder="Residential address"
                  />
                </div>

                {/* Insurance */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Insurance Type</label>
                  <select
                    value={nhisMode === 'none' ? 'private' : 'nhis'}
                    onChange={e => {
                      if (e.target.value === 'private') {
                        setNhisMode('none');
                        setNewPatient({ ...newPatient, nhis_number: '' });
                      } else {
                        setNhisMode('active');
                        setNewPatient({ ...newPatient, nhis_number: '' });
                      }
                    }}
                    className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                  >
                    <option value="private">Private / Self-Paying</option>
                    <option value="nhis">NHIS (National Health Insurance)</option>
                  </select>
                </div>

                {nhisMode !== 'none' && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      NHIS / Ghana Card Number
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      value={newPatient.nhis_number}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setNewPatient({ ...newPatient, nhis_number: val });
                      }}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none font-bold tracking-widest"
                      placeholder="8-digit NHIS or 10-digit Ghana card"
                    />
                    {newPatient.nhis_number.length > 0 && newPatient.nhis_number.length !== 8 && newPatient.nhis_number.length !== 10 && (
                      <p className="text-[10px] text-amber-600 mt-1">Enter 8 digits (NHIS) or 10 digits (Ghana card number)</p>
                    )}
                    {(newPatient.nhis_number.length === 8 || newPatient.nhis_number.length === 10) && (
                      <p className="text-[10px] text-teal-600 mt-1">✓ {newPatient.nhis_number.length === 8 ? 'NHIS number valid' : 'Ghana card number valid'}</p>
                    )}
                  </motion.div>
                )}

                {/* Next of Kin */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Next of Kin — Name</label>
                    <input
                      type="text" value={newPatient.next_of_kin_name}
                      onChange={e => setNewPatient({ ...newPatient, next_of_kin_name: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Next of Kin — Phone</label>
                    <input
                      type="tel" value={newPatient.next_of_kin_phone}
                      onChange={e => setNewPatient({ ...newPatient, next_of_kin_phone: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                      placeholder="0XX XXX XXXX"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setShowRegModal(false); setNhisMode('none'); setNewPatient(defaultPatient); }} className="flex-1 py-3 font-bold text-slate-500 bg-surface-50 rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 font-bold text-white bg-primary-500 rounded-xl">
                    {saving ? 'Registering...' : 'Register Patient'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showVitalsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-lg p-8" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
              <h2 className="text-2xl font-bold mb-2">Record Vitals</h2>
              <p className="text-teal-600 font-bold text-xs uppercase mb-6">{showVitalsModal.name}</p>
              <form onSubmit={handleVitals} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Blood Pressure</label>
                    <input type="text" placeholder="120/80" value={vitals.bp} onChange={e => setVitals({ ...vitals, bp: e.target.value })} className="w-full bg-surface-50 border-none outline-none focus:ring-2 focus:ring-primary-500 rounded-xl py-3 px-4 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Temp (°C)</label>
                    <input type="number" step="0.1" placeholder="36.5" value={vitals.temperature} onChange={e => setVitals({ ...vitals, temperature: e.target.value })} className="w-full bg-surface-50 border-none outline-none focus:ring-2 focus:ring-primary-500 rounded-xl py-3 px-4 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Weight (kg)</label>
                    <input type="number" step="0.1" placeholder="70" value={vitals.weight} onChange={e => setVitals({ ...vitals, weight: e.target.value })} className="w-full bg-surface-50 border-none outline-none focus:ring-2 focus:ring-primary-500 rounded-xl py-3 px-4 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Pulse (bpm)</label>
                    <input type="number" placeholder="72" value={vitals.pulse} onChange={e => setVitals({ ...vitals, pulse: e.target.value })} className="w-full bg-surface-50 border-none outline-none focus:ring-2 focus:ring-primary-500 rounded-xl py-3 px-4 mt-1" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">SpO2 (%)</label>
                    <input type="number" placeholder="98" value={vitals.spo2} onChange={e => setVitals({ ...vitals, spo2: e.target.value })} className="w-full bg-surface-50 border-none outline-none focus:ring-2 focus:ring-primary-500 rounded-xl py-3 px-4 mt-1" />
                  </div>
                </div>

                {showVitalsModal.nhis_number && (
                  <div className="p-6 bg-teal-50/50 border border-teal-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider">NHIS Claims Confirmation (CCC)</h4>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Insurance Eligibility Status</label>
                      <select
                        value={vitals.ccc_status}
                        onChange={e => setVitals({ ...vitals, ccc_status: e.target.value, ccc: e.target.value !== 'generated' ? '' : vitals.ccc })}
                        className="w-full bg-white border border-teal-100 rounded-xl py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        <option value="generated">Card Active (CCC Generated)</option>
                        <option value="inactive">Card Inactive / Expired</option>
                        <option value="unable">Unable to Generate CCC (Network Issue)</option>
                      </select>
                    </div>

                    {vitals.ccc_status === 'generated' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Claims Confirmation Code (5 digits)
                        </label>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={5}
                          value={vitals.ccc}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 5) setVitals({ ...vitals, ccc: val });
                          }}
                          placeholder="e.g. 12345"
                          className="w-full bg-white border border-teal-100 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 tracking-widest font-bold"
                        />
                        {vitals.ccc.length > 0 && vitals.ccc.length < 5 && (
                          <p className="text-[10px] text-amber-600 mt-1">{5 - vitals.ccc.length} more digit{vitals.ccc.length < 4 ? 's' : ''} needed</p>
                        )}
                      </motion.div>
                    )}

                    {vitals.ccc_status === 'unable' && (
                      <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-3 items-start">
                        <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-orange-800 leading-relaxed font-medium">Record will be flagged for follow-up. Doctor and Admin will be notified that CCC is missing due to network issues.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowVitalsModal(null)} className="flex-1 py-3 font-bold text-slate-500 bg-surface-50 rounded-xl">Cancel</button>
                  <button
                    type="submit"
                    disabled={saving || (!!showVitalsModal.nhis_number && vitals.ccc_status === 'generated' && vitals.ccc.length !== 5)}
                    className="flex-1 py-3 font-bold text-white bg-primary-500 rounded-xl disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save & Refer to Doctor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {selectedPatient && (
          <MedicalHistory
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
