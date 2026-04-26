import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Stethoscope, 
  ClipboardList, 
  Calendar, 
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface HistoryRecord {
  id: string;
  illness: string;
  treatment: string;
  notes: string;
  recorded_at: string;
  doctor_name: string;
}

export default function MedicalHistory({ 
  patient, 
  onClose 
}: { 
  patient: any; 
  onClose: () => void 
}) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    illness: '',
    treatment: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [patient.id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history/${patient.id}`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          patientId: patient.id,
          ...newRecord
        })
      });

      if (!res.ok) throw new Error('Failed to save record');
      
      setNewRecord({ illness: '', treatment: '', notes: '' });
      setShowAddForm(false);
      fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-y-0 right-0 w-full max-w-xl glass shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-8 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white">
                <ClipboardList className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">Medical History</h2>
                <p className="text-xs font-bold text-teal-600 uppercase tracking-widest leading-none mt-1">{patient.name}</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col">
        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full py-4 border-2 border-dashed border-teal-500/30 rounded-2xl text-teal-600 font-bold flex items-center justify-center gap-2 hover:bg-teal-50 transition-all border-spacing-4"
          >
            <Plus className="w-5 h-5" />
            Add New Record
          </button>
        ) : (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} 
            className="glass-dark p-6 rounded-3xl space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">New Clinical Record</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Illness / Condition</label>
                    <input 
                        type="text" 
                        required
                        value={newRecord.illness}
                        onChange={e => setNewRecord({...newRecord, illness: e.target.value})}
                        className="w-full bg-white/50 border border-white/20 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                        placeholder="e.g. Chronic Hypertension"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Treatment / Prescription</label>
                    <input 
                        type="text" 
                        value={newRecord.treatment}
                        onChange={e => setNewRecord({...newRecord, treatment: e.target.value})}
                        className="w-full bg-white/50 border border-white/20 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                        placeholder="e.g. Amlodipine 5mg daily"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clinical Notes</label>
                    <textarea 
                        rows={3}
                        value={newRecord.notes}
                        onChange={e => setNewRecord({...newRecord, notes: e.target.value})}
                        className="w-full bg-white/50 border border-white/20 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                        placeholder="Detailed observation..."
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Save Record</>}
            </button>
          </motion.form>
        )}

        <div className="flex-1 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Past Records Timeline</h3>
            
            {loading ? (
                <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>
            ) : history.length === 0 ? (
                <div className="h-64 glass-dark rounded-3xl flex flex-col items-center justify-center p-8 text-center opacity-50 italic">
                    <AlertCircle className="w-10 h-10 mb-4" />
                    <p className="text-sm">No medical records found for this patient.</p>
                </div>
            ) : (
                <div className="space-y-6 relative ml-4 border-l-2 border-teal-500/10 pl-8">
                    {history.map((record) => (
                        <div key={record.id} className="relative">
                            <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-white border-4 border-teal-500 shadow-sm"></div>
                            <div className="glass-dark p-6 rounded-3xl group hover:bg-white/40 transition-all cursor-default relative overflow-hidden">
                                <span className="absolute top-4 right-6 text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-teal-400 transition-colors">
                                    {format(new Date(record.recorded_at), 'dd MMM yyyy')}
                                </span>
                                <div className="flex items-center gap-2 mb-3">
                                    <Stethoscope className="w-4 h-4 text-teal-500" />
                                    <h4 className="text-lg font-bold text-slate-800 leading-none">{record.illness}</h4>
                                </div>
                                
                                <div className="space-y-3">
                                    {record.treatment && (
                                        <div className="inline-block px-3 py-1 bg-teal-500/10 rounded-lg text-teal-700 text-xs font-bold ring-1 ring-teal-500/20">
                                            Treatment: {record.treatment}
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-4 py-1">
                                        "{record.notes}"
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black">Dr</div>
                                        Recorded by {record.doctor_name}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </motion.div>
  );
}
