import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function CCCAlerts() {
  const [missingCCC, setMissingCCC] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissing = async () => {
    try {
      const res = await fetch('/api/history/vitals/missing-ccc', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMissingCCC(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissing();
    // Poll every minute
    const interval = setInterval(fetchMissing, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (missingCCC.length === 0) return null;

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="mb-8"
    >
      <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-orange-950">Missing NHIS CCC Codes</h3>
              <p className="text-[10px] uppercase font-black tracking-widest text-orange-600 mt-0.5">{missingCCC.length} unresolved insurance claims</p>
            </div>
          </div>
          <button className="text-xs font-bold text-orange-700 bg-white/50 px-4 py-2 rounded-xl border border-orange-100 hover:bg-white transition-all">View All Alerts</button>
        </div>
        
        <div className="space-y-3">
          {missingCCC.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-orange-100/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">
                  {item.patient_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.patient_name}</p>
                  <p className="text-[10px] font-medium text-slate-500">NHIS: {item.nhis_number} • Vital ID: {item.id.substring(0,8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase">Network Issue</span>
                <button 
                  onClick={() => toast.info('CMS Integration required for one-click generation')}
                  className="p-2 hover:bg-orange-100 rounded-xl transition-all text-orange-600"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {missingCCC.length > 3 && (
            <p className="text-center text-[10px] font-bold text-slate-400 py-1">And {missingCCC.length - 3} more outstanding records...</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
