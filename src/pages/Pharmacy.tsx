import React, { useEffect, useState } from 'react';
import { 
  Pill, 
  Package, 
  FilePlus, 
  History, 
  AlertTriangle, 
  Search, 
  Plus, 
  Download, 
  MoreHorizontal, 
  Trash2, 
  CheckCircle2, 
  Clock,
  Printer,
  Edit2,
  FileText,
  X,
  Stethoscope,
  Info,
  Loader2,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, isBefore, addDays } from 'date-fns';
import { toast } from 'sonner';
import HospitalUpdates from '../components/HospitalUpdates';

export default function Pharmacy() {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'inventory' | 'requisition' | 'served'>('prescriptions');
  const [alerts, setAlerts] = useState<{ low: number, expiring: number }>({ low: 0, expiring: 0 });

  useEffect(() => {
    fetch('/api/stations/pharmacy/inventory', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => {
          const today = new Date();
          const thirtyDays = addDays(today, 30);
          const low = data.filter((i: any) => i.quantity <= i.low_stock_threshold).length;
          const expiring = data.filter((i: any) => isBefore(new Date(i.expiry_date), thirtyDays)).length;
          setAlerts({ low, expiring });
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {(alerts.low > 0 || alerts.expiring > 0) && (
        <div className="mb-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {alerts.low > 0 && (
                <div className="flex-shrink-0 flex items-center gap-3 bg-yellow-50 border border-yellow-100 px-6 py-3 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">{alerts.low} Items Low Stock</p>
                        <p className="text-xs font-bold text-yellow-600/80">Reorder required soon</p>
                    </div>
                </div>
            )}
            {alerts.expiring > 0 && (
                <div className="flex-shrink-0 flex items-center gap-3 bg-red-50 border border-red-100 px-6 py-3 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center text-red-600">
                        <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">{alerts.expiring} Items Expiring</p>
                        <p className="text-xs font-bold text-red-600/80">Within 30 days window</p>
                    </div>
                </div>
            )}
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pharmacy Center</h1>
          <p className="text-sm text-slate-500 mt-1">Dispensing, Inventory & Claims Management</p>
        </div>
        <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-sm">
          {[
            { id: 'prescriptions', icon: Clock, label: 'Queue' },
            { id: 'inventory', icon: Package, label: 'Inventory' },
            { id: 'requisition', icon: FilePlus, label: 'Orders' },
            { id: 'served', icon: History, label: 'History' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20" 
                  : "text-slate-500 hover:bg-white hover:text-teal-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {activeTab === 'prescriptions' && <PrescriptionQueue />}
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'requisition' && <RequisitionSystem />}
        {activeTab === 'served' && <ServedPatientsManagement />}
      </div>

      <HospitalUpdates user={{ role: 'pharmacist' }} />
    </div>
  );
}

// --- HELPERS ---

function formatRxDetails(med: any): string {
  if (med.dose_qty && med.duration) {
    const freqMap: Record<string, string> = { '1': 'once daily', '2': 'twice daily', '3': 'three times daily', '4': 'four times daily' };
    const freq = freqMap[String(med.frequency)] || `${med.frequency}× daily`;
    const type = (med.drug_type || 'unit').toLowerCase();
    return `Take ${med.dose_qty} ${type}(s) ${freq} for ${med.duration} day(s) — Total qty: ${med.qty || 1}`;
  }
  return [med.dosage, med.frequency].filter(Boolean).join(' • ') || 'As prescribed';
}

// --- SUB-COMPONENTS ---

function PrescriptionQueue() {
  const [list, setList] = useState<any[]>([]);
  const [showReferral, setShowReferral] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    fetchPending();
    fetch('/api/stations/pharmacy/inventory', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
      .then(r => r.json()).then(setInventory).catch(() => {});
  }, []);

  const fetchPending = async () => {
    const res = await fetch('/api/stations/pharmacy/pending', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } });
    setList(await res.json());
  };

  const checkStock = (medName: string): boolean => {
    if (!medName) return false;
    const q = medName.toLowerCase();
    const first = q.split(' ')[0];
    const item = inventory.find(i => {
      const n = i.name.toLowerCase();
      return n === q || n.includes(first) || q.includes(n.split(' ')[0]);
    });
    return item ? item.quantity > 0 : false;
  };

  const markReady = async (id: string) => {
    const res = await fetch(`/api/stations/pharmacy/${id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } });
    if (res.ok) { toast.success('Prescription ready for collection'); fetchPending(); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(presc => {
          const hasOutOfStock = (presc.medications || []).some((m: any) => !checkStock(m.name));
          return (
            <div key={presc.id} className="glass p-6 rounded-3xl group hover:ring-2 hover:ring-teal-500/20 transition-all">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="font-bold text-slate-800">{presc.patient_name}</h3>
                  <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-0.5">Ref: {presc.id.substring(0,8).toUpperCase()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 shadow-inner group-hover:scale-110 transition-transform">
                  <Pill className="w-5 h-5"/>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {(presc.medications || []).map((med: any, i: number) => {
                  const inStock = checkStock(med.name);
                  return (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${inStock ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {med.name}{med.measurement ? ` (${med.measurement})` : ''}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ml-2 flex-shrink-0 ${inStock ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button onClick={() => markReady(presc.id)}
                  className="flex-1 py-3 bg-teal-500 text-white font-bold rounded-xl text-xs hover:bg-teal-600 transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Ready
                </button>
                <button onClick={() => setShowReferral(presc)}
                  className={`px-4 py-3 font-bold rounded-xl text-xs transition-all flex items-center gap-1 ${hasOutOfStock ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  title={hasOutOfStock ? 'Some drugs out of stock — generate referral' : 'External Referral'}>
                  <FileText className="w-4 h-4" />
                  {hasOutOfStock && <span className="text-[9px]">Refer</span>}
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="col-span-full h-48 bg-white/30 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
            <Clock className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">Pharmacy queue is currently empty</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showReferral && (() => {
          const outOfStock = (showReferral.medications || []).filter((m: any) => !checkStock(m.name));
          const medsToShow = outOfStock.length > 0 ? outOfStock : (showReferral.medications || []);
          return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 bg-slate-50 border-b flex justify-between items-center no-print">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">External Referral Letter</h2>
                    {outOfStock.length > 0 && (
                      <p className="text-xs text-red-500 font-bold mt-0.5">{outOfStock.length} medication(s) unavailable in stock</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-teal-600 transition-all">
                      <Printer className="w-4 h-4" /> Print Letter
                    </button>
                    <button onClick={() => setShowReferral(null)} className="p-2 text-slate-400 hover:text-slate-600"><X/></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12 print-content print:p-0">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center text-white font-black text-2xl">M</div>
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Medlink Medical Center</h1>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pharmacy Referral Service</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-10 p-6 bg-slate-50 rounded-2xl print:bg-transparent print:border print:p-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Patient Name</p>
                      <p className="text-lg font-bold text-slate-800">{showReferral.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Date Issued</p>
                      <p className="text-lg font-bold text-slate-800">{format(new Date(), 'dd MMMM yyyy')}</p>
                    </div>
                  </div>

                  {outOfStock.length > 0 && (
                    <p className="text-sm text-slate-600 mb-8 p-4 bg-red-50 rounded-xl border border-red-100">
                      The following medication(s) are currently <strong>unavailable</strong> at our pharmacy.
                      This patient is referred to any licensed external pharmacy for dispensing as prescribed by the attending physician.
                    </p>
                  )}

                  <div className="mb-12">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 pb-2 border-b-2 border-teal-500 inline-block">
                      {outOfStock.length > 0 ? 'Unavailable Medications (Require External Dispensing)' : 'Prescribed Medications'}
                    </h3>
                    <div className="space-y-6">
                      {medsToShow.map((med: any, i: number) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold shrink-0">{i+1}</div>
                          <div>
                            <p className="text-lg font-black text-slate-800 leading-tight">
                              {med.name}{med.measurement ? ` — ${med.measurement}` : ''}
                            </p>
                            {med.drug_type && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{med.drug_type}</p>}
                            <p className="text-sm font-bold text-teal-600 mt-1">{formatRxDetails(med)}</p>
                            <p className="text-xs text-slate-500 mt-1 italic">Dispense exact brand or bioequivalent as prescribed.</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-16 pt-8 border-t flex justify-between items-end">
                    <div className="text-[10px] text-slate-400 max-w-[200px]">
                      This document is an official referral from Medlink Medical Center. These medications are required for the patient's therapeutic management.
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800 underline decoration-teal-500/30 decoration-4">Dr. {showReferral.doctor_name || 'Medical Officer'}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Prescribing Physician</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

function InventoryManagement() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    const res = await fetch('/api/stations/pharmacy/inventory', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } });
    setInventory(await res.json());
  };

  const getStatus = (item: any) => {
    const expiry = new Date(item.expiry_date);
    const today = new Date();
    if (isBefore(expiry, today)) return { label: 'EXPIRED', color: 'bg-red-500', icon: Trash2 };
    if (isBefore(expiry, addDays(today, 30))) return { label: 'EXPIRING SOON', color: 'bg-orange-500', icon: AlertTriangle };
    if (item.quantity <= item.low_stock_threshold) return { label: 'LOW STOCK', color: 'bg-yellow-500', icon: AlertTriangle };
    return { label: 'IN STOCK', color: 'bg-teal-500', icon: CheckCircle2 };
  };

  const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search drugs, supplies, categories..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => { setEditingItem(null); setShowAddModal(true); }}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" /> Add New Item
        </button>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <table className="w-full">
            <thead className="bg-slate-50/50">
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-8 py-5">Item Details</th>
                    <th className="px-8 py-5 text-center">Stock Level</th>
                    <th className="px-8 py-5">Expiry Date</th>
                    <th className="px-8 py-5">Price</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {filtered.map(item => {
                    const status = getStatus(item);
                    return (
                        <tr key={item.id} className="hover:bg-teal-50/20 transition-all group">
                            <td className="px-8 py-5">
                                <p className="font-bold text-slate-800">{item.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category} • {item.unit}</p>
                            </td>
                            <td className="px-8 py-5 text-center">
                                <div className="text-lg font-black text-slate-800">{item.quantity}</div>
                                <div className="text-[10px] font-bold text-slate-400 italic">Limit: {item.low_stock_threshold}</div>
                            </td>
                            <td className="px-8 py-5">
                                <p className={cn("text-xs font-bold", isBefore(new Date(item.expiry_date), addDays(new Date(), 30)) ? "text-red-500" : "text-slate-600")}>
                                    {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                                </p>
                            </td>
                            <td className="px-8 py-5">
                                <div className="text-sm font-bold text-slate-800">GH₵{item.unit_price}</div>
                            </td>
                            <td className="px-8 py-5">
                                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black text-white uppercase shadow-sm", status.color)}>
                                    <status.icon className="w-3 h-3" />
                                    {status.label}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <button 
                                    onClick={() => { setEditingItem(item); setShowAddModal(true); }}
                                    className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-xl transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-6 text-slate-900">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-xl p-8" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                    <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit Item' : 'Add New Inventory Item'}</h2>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const data = Object.fromEntries(new FormData(e.currentTarget));
                        const res = await fetch('/api/stations/pharmacy/inventory', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                            body: JSON.stringify(editingItem ? { ...data, id: editingItem.id } : data)
                        });
                        if (res.ok) {
                            toast.success('Inventory updated');
                            setShowAddModal(false);
                            fetchInventory();
                        }
                    }} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Item Name</label>
                            <input name="name" required defaultValue={editingItem?.name} className="w-full glass bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                            <input name="category" required defaultValue={editingItem?.category} className="w-full glass bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unit Type</label>
                            <input name="unit" required placeholder="Tablet, Bottle, etc" defaultValue={editingItem?.unit} className="w-full glass bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Quantity</label>
                            <input name="quantity" type="number" required defaultValue={editingItem?.quantity} className="w-full glass bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Expiry Date</label>
                            <input name="expiry_date" type="date" required defaultValue={editingItem?.expiry_date} className="w-full glass bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Low Stock Limit</label>
                            <input name="low_stock_threshold" type="number" required defaultValue={editingItem?.low_stock_threshold || 10} className="w-full glass bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unit Price (GH₵)</label>
                            <input name="unit_price" type="number" step="0.01" required defaultValue={editingItem?.unit_price} className="w-full glass bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20" />
                        </div>
                        <div className="col-span-2 flex gap-4 mt-4">
                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 font-bold text-slate-500">Cancel</button>
                            <button type="submit" className="flex-1 py-3 bg-teal-500 text-white font-bold rounded-xl shadow-lg">Save Record</button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RequisitionSystem() {
  const [items, setItems] = useState([{ name: '', qty: '' }]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/stations/pharmacy/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ items: items.filter(i => i.name && i.qty) })
    });
    if (res.ok) {
        toast.success('Requisition submitted for approval');
        setItems([{ name: '', qty: '' }]);
    }
    setSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-bl-full -mr-8 -mt-8" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">New Stock Requisition</h2>
            <p className="text-slate-500 text-sm mb-8">Generate official requests for pharmacy restocking.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                    {items.map((item, index) => (
                        <div key={index} className="flex gap-3 group">
                            <input 
                                placeholder="Item description..." 
                                value={item.name}
                                onChange={e => {
                                    const n = [...items];
                                    n[index].name = e.target.value;
                                    setItems(n);
                                }}
                                className="flex-1 glass bg-white px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-medium"
                            />
                            <input 
                                type="number" 
                                placeholder="Qty" 
                                value={item.qty}
                                onChange={e => {
                                    const n = [...items];
                                    n[index].qty = e.target.value;
                                    setItems(n);
                                }}
                                className="w-24 glass bg-white px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-black"
                            />
                            {items.length > 1 && (
                                <button 
                                    type="button" 
                                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                                    className="p-3 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-xl"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button 
                    type="button" 
                    onClick={() => setItems([...items, { name: '', qty: '' }])}
                    className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-teal-500/30 hover:text-teal-600 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Another Item
                </button>

                <div className="flex gap-4 pt-6 border-t border-slate-50">
                    <button 
                        type="button"
                        onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                                printWindow.document.write(`
                                    <html>
                                        <head>
                                            <title>Pharmacy Requisition Form</title>
                                            <style>
                                                body { font-family: sans-serif; padding: 40px; color: #1e293b; }
                                                h1 { color: #0d9488; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                                                th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                                                th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
                                                .footer { margin-top: 60px; border-top: 2px solid #f1f5f9; padding-top: 20px; font-size: 12px; }
                                            </style>
                                        </head>
                                        <body>
                                            <h1>Medlink: Stock Requisition Form</h1>
                                            <p>Date: ${format(new Date(), 'dd MMMM yyyy')}</p>
                                            <table>
                                                <thead><tr><th>No.</th><th>Item Description</th><th>Requested Qty</th></tr></thead>
                                                <tbody>
                                                    ${items.filter(i => i.name).map((i, idx) => `<tr><td>${idx+1}</td><td>${i.name}</td><td>${i.qty}</td></tr>`).join('')}
                                                </tbody>
                                            </table>
                                            <div class="footer">
                                                <p>Requested by: __________________________ (Pharmacist Signature)</p>
                                                <p>Approved by: __________________________ (Administrator Signature)</p>
                                            </div>
                                            <script>window.print();</script>
                                        </body>
                                    </html>
                                `);
                                printWindow.document.close();
                            }
                        }}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Download/Print Form
                    </button>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="flex-1 py-4 bg-teal-500 text-white font-bold rounded-2xl text-xs hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit for Approval</>}
                    </button>
                </div>
            </form>
        </div>

        <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-4">Recent Requests</h3>
            <div className="glass rounded-[2.5rem] overflow-hidden">
                <div className="p-8">
                    <RequisitionList />
                </div>
            </div>
        </div>
    </div>
  );
}

function RequisitionList() {
    const [reqs, setReqs] = useState<any[]>([]);
    useEffect(() => {
        fetch('/api/stations/pharmacy/requisitions', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
            .then(res => res.json())
            .then(setReqs);
    }, []);

    return (
        <div className="space-y-4">
            {reqs.map(r => (
                <div key={r.id} className="p-4 rounded-2xl bg-white/50 border border-slate-50 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Req: {r.id.substring(0,8).toUpperCase()}</p>
                            <p className="text-xs font-bold text-slate-800">{(r.items || []).length} items requested</p>
                        </div>
                    </div>
                    <span className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                        r.status === 'approved' ? "bg-teal-100 text-teal-600" : "bg-orange-100 text-orange-600"
                    )}>
                        {r.status}
                    </span>
                </div>
            ))}
        </div>
    );
}

function ServedPatientsManagement() {
    const [served, setServed] = useState<any[]>([]);
    const [selectedAmending, setSelectedAmending] = useState<any>(null);
    const [amendmentForm, setAmendmentForm] = useState({ reason: '', meds: [] as any[] });

    useEffect(() => { fetchServed(); }, []);

    const fetchServed = async () => {
        const res = await fetch('/api/stations/pharmacy/served', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } });
        setServed(await res.json());
    };

    const handleAmend = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/stations/pharmacy/prescriptions/${selectedAmending.id}/amend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
            body: JSON.stringify({ 
                newMedications: amendmentForm.meds,
                reason: amendmentForm.reason
            })
        });
        if (res.ok) {
            toast.success('Dispensation amended and logged for admin review');
            setSelectedAmending(null);
            fetchServed();
        }
    };

    return (
        <div className="space-y-6">
            <div className="glass rounded-[2rem] overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="px-8 py-5">Patient & Date</th>
                            <th className="px-8 py-5">Prescribing Doctor</th>
                            <th className="px-8 py-5">Dispensed Items</th>
                            <th className="px-8 py-5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {served.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="px-8 py-5">
                                    <p className="font-bold text-slate-800">{p.patient_name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{format(new Date(p.createdAt), 'MMM dd, yyyy • HH:mm')}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-[10px]">DR</div>
                                        <p className="text-xs font-bold text-slate-600">{p.doctor_name}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex flex-wrap gap-2">
                                        {(p.medications || []).map((m: any, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-white border border-slate-100 rounded text-[10px] font-bold text-slate-500">{m.name}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button 
                                        onClick={() => { 
                                            setSelectedAmending(p); 
                                            setAmendmentForm({ reason: '', meds: [...(p.medications || [])] });
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-teal-600 transition-all shadow-lg shadow-black/5"
                                    >
                                        <Edit2 className="w-3 h-3" /> Amend
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {selectedAmending && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-6 text-slate-900">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card w-full max-w-2xl p-10" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Amend Dispensation</h2>
                                    <p className="text-teal-600 text-xs font-bold uppercase tracking-widest mt-1">Patient: {selectedAmending.patient_name}</p>
                                </div>
                                <button onClick={() => setSelectedAmending(null)} className="p-2 hover:bg-slate-50 rounded-full"><X/></button>
                            </div>

                            <form onSubmit={handleAmend} className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Medications</h4>
                                    {amendmentForm.meds.map((m: any, i: number) => (
                                        <div key={i} className="grid grid-cols-2 gap-4">
                                            <input 
                                                value={m.name}
                                                onChange={e => {
                                                    const n = [...amendmentForm.meds];
                                                    n[i].name = e.target.value;
                                                    setAmendmentForm({...amendmentForm, meds: n});
                                                }}
                                                className="glass bg-white px-4 py-3 rounded-xl text-xs font-medium"
                                                placeholder="Medication name"
                                            />
                                            <div className="flex gap-2">
                                                <input 
                                                    value={m.dosage}
                                                    onChange={e => {
                                                        const n = [...amendmentForm.meds];
                                                        n[i].dosage = e.target.value;
                                                        setAmendmentForm({...amendmentForm, meds: n});
                                                    }}
                                                    className="flex-1 glass bg-white px-4 py-3 rounded-xl text-xs font-black"
                                                    placeholder="Dosage"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const n = amendmentForm.meds.filter((_, idx) => idx !== i);
                                                        setAmendmentForm({...amendmentForm, meds: n});
                                                    }}
                                                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        type="button"
                                        onClick={() => setAmendmentForm({...amendmentForm, meds: [...amendmentForm.meds, {name: '', dosage: '', frequency: ''}]})}
                                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-teal-600 transition-all"
                                    >
                                        + Add Medication
                                    </button>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason for Amendment</label>
                                    <textarea 
                                        required
                                        value={amendmentForm.reason}
                                        onChange={e => setAmendmentForm({...amendmentForm, reason: e.target.value})}
                                        className="w-full glass bg-white p-4 rounded-2xl h-24 text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                                        placeholder="Explain why the dispensation is being changed..."
                                    />
                                </div>

                                <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 items-start border border-orange-100">
                                    <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-orange-800 font-medium leading-relaxed">
                                        CRITICAL: This action will be logged in the system audit records for administrative review. Ensure clarity in the amendment reason.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setSelectedAmending(null)} className="flex-1 py-4 font-bold text-slate-500">Cancel</button>
                                    <button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all">Submit Amendment</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
