import { useEffect, useState } from 'react';
import { Package, Search, AlertCircle, Plus, Edit2, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { format, isBefore, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const defaultForm = { name: '', category: 'Medications', quantity: '', unit: 'Units', expiry_date: '', low_stock_threshold: '50', unit_price: '' };

function stockStatus(item: any): { label: string; color: string } {
  if (item.quantity <= 0) return { label: 'Out of Stock', color: 'bg-red-50 text-red-600' };
  if (item.quantity <= item.low_stock_threshold) return { label: 'Low Stock', color: 'bg-amber-50 text-amber-600' };
  if (item.expiry_date && isBefore(new Date(item.expiry_date), addDays(new Date(), 30))) return { label: 'Expiring Soon', color: 'bg-orange-50 text-orange-600' };
  return { label: 'Safe', color: 'bg-emerald-50 text-emerald-600' };
}

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/stations/pharmacy/inventory', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => { setEditItem(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name, category: item.category, quantity: String(item.quantity),
      unit: item.unit, expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      low_stock_threshold: String(item.low_stock_threshold), unit_price: String(item.unit_price),
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...(editItem ? { id: editItem.id || editItem._id } : {}),
        name: form.name, category: form.category, quantity: Number(form.quantity),
        unit: form.unit, expiry_date: form.expiry_date || undefined,
        low_stock_threshold: Number(form.low_stock_threshold), unit_price: Number(form.unit_price),
      };
      const res = await fetch('/api/stations/pharmacy/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Item updated' : 'Item added');
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inventory item?')) return;
    try {
      await fetch(`/api/stations/pharmacy/inventory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      toast.success('Item deleted');
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const total       = items.length;
  const lowStock    = items.filter(i => i.quantity > 0 && i.quantity <= i.low_stock_threshold).length;
  const outOfStock  = items.filter(i => i.quantity <= 0).length;
  const expiringSoon = items.filter(i => i.expiry_date && isBefore(new Date(i.expiry_date), addDays(new Date(), 30))).length;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Track medication stock and hospital supplies.</p>
        </div>
        <button onClick={openAdd} className="bg-primary-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all text-sm">
          <Plus className="w-5 h-5" /> Add New Item
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-primary-500">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Items</p>
          <h4 className="text-2xl font-black text-gray-900 mt-1">{total}</h4>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Low Stock</p>
          <h4 className="text-2xl font-black text-amber-600 mt-1">{lowStock}</h4>
        </div>
        <div className="glass-card p-6 border-l-4 border-red-500">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Out of Stock</p>
          <h4 className="text-2xl font-black text-red-600 mt-1">{outOfStock}</h4>
        </div>
        <div className="glass-card p-6 border-l-4 border-orange-500">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expiring Soon</p>
          <h4 className="text-2xl font-black text-orange-600 mt-1">{expiringSoon}</h4>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-6 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by item name or category..."
              className="w-full bg-surface-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50 bg-surface-50/30">
                <th className="px-8 py-5">ITEM NAME</th>
                <th className="px-8 py-5">CATEGORY</th>
                <th className="px-8 py-5">STOCK</th>
                <th className="px-8 py-5">UNIT PRICE</th>
                <th className="px-8 py-5">EXPIRY</th>
                <th className="px-8 py-5">STATUS</th>
                <th className="px-8 py-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-8 py-16 text-center text-gray-400">Loading inventory...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-16 text-center text-gray-400">No items found. Add your first inventory item!</td></tr>
              ) : filtered.map((item) => {
                const st = stockStatus(item);
                return (
                  <tr key={item.id || item._id} className="hover:bg-primary-50/20 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center text-gray-400">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{item.name}</div>
                          <div className="text-[10px] font-medium text-gray-400">{item.unit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-gray-500">{item.category}</td>
                    <td className="px-8 py-5 font-bold text-gray-700">{item.quantity} {item.unit}</td>
                    <td className="px-8 py-5 font-bold text-primary-600">GH₵{Number(item.unit_price).toFixed(2)}</td>
                    <td className="px-8 py-5 text-xs text-gray-500">
                      {item.expiry_date ? format(new Date(item.expiry_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn('px-3 py-1.5 rounded-full text-[10px] font-bold', st.color)}>
                        {st.label.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="p-2 hover:bg-primary-50 rounded-lg text-gray-400 hover:text-primary-600 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id || item._id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-md p-8" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{editItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Item Name</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none">
                      <option>Medications</option>
                      <option>Consumables</option>
                      <option>IV &amp; Fluids</option>
                      <option>Lab Supplies</option>
                      <option>Equipment</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Unit</label>
                    <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="Tablets, Bottles..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Quantity</label>
                    <input required type="number" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Unit Price (GH₵)</label>
                    <input type="number" step="0.01" min="0" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Low Stock Alert</label>
                    <input type="number" min="0" value={form.low_stock_threshold} onChange={e => setForm({...form, low_stock_threshold: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Expiry Date</label>
                    <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-slate-500 bg-surface-50 rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 font-bold text-white bg-primary-500 rounded-xl">
                    {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
