import { useEffect, useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2, ShieldCheck, ToggleLeft, ToggleRight, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';

const ROLES = [
  { id: 'admin',          label: 'Admin',          color: 'bg-purple-100 text-purple-700' },
  { id: 'doctor',         label: 'Doctor',         color: 'bg-blue-100 text-blue-700' },
  { id: 'nurse',          label: 'Nurse',          color: 'bg-green-100 text-green-700' },
  { id: 'pharmacist',     label: 'Pharmacist',     color: 'bg-amber-100 text-amber-700' },
  { id: 'lab_technician', label: 'Lab Technician', color: 'bg-orange-100 text-orange-700' },
  { id: 'accounts',       label: 'Accounts',       color: 'bg-pink-100 text-pink-700' },
];

const PERMISSION_GROUPS = [
  {
    group: 'Patient Management',
    permissions: [
      { id: 'register_patients', label: 'Register & Manage Patients' },
      { id: 'view_all_patients', label: 'View All Patient Records' },
      { id: 'delete_patients',   label: 'Delete Patient Records' },
    ],
  },
  {
    group: 'Clinical',
    permissions: [
      { id: 'record_vitals',        label: 'Record Patient Vitals' },
      { id: 'create_consultations', label: 'Create Consultations' },
      { id: 'view_medical_history', label: 'View Full Medical History' },
    ],
  },
  {
    group: 'Laboratory',
    permissions: [
      { id: 'create_lab_requests', label: 'Create Lab Requests' },
      { id: 'manage_lab_results',  label: 'Manage Lab Results' },
    ],
  },
  {
    group: 'Pharmacy',
    permissions: [
      { id: 'view_prescriptions',  label: 'View Prescriptions' },
      { id: 'amend_prescriptions', label: 'Amend Prescriptions' },
      { id: 'manage_inventory',    label: 'Manage Pharmacy Inventory' },
    ],
  },
  {
    group: 'Administration',
    permissions: [
      { id: 'manage_users',        label: 'Manage Staff Accounts' },
      { id: 'manage_roles',        label: 'Configure Roles & Permissions' },
      { id: 'manage_admissions',   label: 'Manage Patient Admissions' },
      { id: 'manage_appointments', label: 'Manage Appointments' },
      { id: 'manage_notices',      label: 'Post Hospital Notices' },
      { id: 'view_reports',        label: 'View Reports & Analytics' },
    ],
  },
  {
    group: 'Billing',
    permissions: [
      { id: 'manage_billing', label: 'Process Payments & Billing' },
      { id: 'view_billing',   label: 'View Billing Records' },
    ],
  },
];

const getRoleInfo = (roleId: string) =>
  ROLES.find(r => r.id === roleId) || { label: roleId, color: 'bg-gray-100 text-gray-700' };

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'nurse',
  specialty: '', schedule: '', permissions: [] as string[],
};

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState<'info' | 'privileges'>('info');
  const [selected, setSelected] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const authHeader = () => ({ Authorization: `Bearer ${sessionStorage.getItem('token')}` });

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: authHeader() });
      if (res.ok) setStaff(await res.json());
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) &&
      (roleFilter === 'all' || s.role === roleFilter)
    );
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Staff member added');
      setShowAddModal(false);
      setForm({ ...EMPTY_FORM });
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (member: any) => {
    setSelected(member);
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      specialty: member.specialty || '',
      schedule: member.schedule || '',
      permissions: member.permissions || [],
    });
    setEditTab('info');
    setShowPw(false);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = {
        name: form.name, email: form.email, role: form.role,
        specialty: form.specialty, schedule: form.schedule,
        permissions: form.permissions,
      };
      if (form.password) body.password = form.password;
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Staff updated');
      setShowEditModal(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: any) => {
    try {
      const res = await fetch(`/api/admin/users/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(member.is_active ? 'Staff deactivated' : 'Staff activated');
      fetchStaff();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE', headers: authHeader(),
      });
      if (!res.ok) throw new Error();
      toast.success('Staff member removed');
      setDeleteTarget(null);
      fetchStaff();
    } catch {
      toast.error('Failed to remove staff');
    }
  };

  const togglePermission = (permId: string) =>
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(permId)
        ? f.permissions.filter(p => p !== permId)
        : [...f.permissions, permId],
    }));

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.is_active !== false).length,
    byRole: ROLES.map(r => ({ ...r, count: staff.filter(s => s.role === r.id).length })).filter(r => r.count > 0),
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hospital staff, roles, and access privileges.</p>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setShowPw(false); setShowAddModal(true); }}
          className="bg-primary-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
        >
          <Plus className="w-5 h-5" /> Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Staff</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>
        {stats.byRole.slice(0, 2).map(r => (
          <div key={r.id} className="glass-card p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{r.label}s</p>
            <p className="text-3xl font-bold text-gray-900">{r.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary-500/10 shadow-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm outline-none focus:ring-4 focus:ring-primary-500/10 shadow-sm font-medium"
        >
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card p-8 space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <Users className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No staff members found.</p>
          <p className="text-sm text-gray-400 mt-1">Add a staff member using the button above.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Staff</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Specialty</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Privileges</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(member => {
                const roleInfo = getRoleInfo(member.role);
                const perms: string[] = member.permissions || [];
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=effafa&color=46a2a2&size=40`}
                          className="w-9 h-9 rounded-xl flex-shrink-0"
                          alt={member.name}
                        />
                        <div>
                          <p className="font-bold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 hidden md:table-cell text-gray-500 text-sm">
                      {member.specialty || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-4 px-6 hidden lg:table-cell">
                      {perms.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-teal-500" />
                          <span className="text-xs font-bold text-teal-600">{perms.length} extra</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">Default only</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${member.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                        {member.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(member)}
                          title="Edit"
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(member)}
                          title={member.is_active !== false ? 'Deactivate' : 'Activate'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${member.is_active !== false ? 'bg-gray-100 hover:bg-amber-50 hover:text-amber-600' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {member.is_active !== false ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(member)}
                          title="Remove"
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Add Staff Member</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4" autoComplete="off">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                  <input required autoComplete="off" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="Full name" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                  <input required type="email" autoComplete="off" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="staff@medlink.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                  <div className="relative mt-1">
                    <input required type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 pr-10 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="Secure password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                  <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none">
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                {form.role === 'doctor' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Specialty</label>
                      <input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                        className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="e.g. Cardiology" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Schedule</label>
                      <input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })}
                        className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="e.g. Mon–Fri 08:00–17:00" />
                    </div>
                  </>
                )}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 font-bold text-slate-500 bg-surface-50 rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 font-bold text-white bg-primary-500 rounded-xl disabled:opacity-60">
                    {saving ? 'Adding...' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Staff Modal */}
      <AnimatePresence>
        {showEditModal && selected && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-2xl p-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Edit Staff</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{selected.email}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditTab('info')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${editTab === 'info' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab('privileges')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${editTab === 'privileges' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  Privileges
                  {form.permissions.length > 0 && (
                    <span className="ml-1.5 bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full">{form.permissions.length}</span>
                  )}
                </button>
              </div>

              <form onSubmit={handleEdit} className="flex-1 overflow-y-auto flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {editTab === 'info' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                        <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                        <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                          className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none">
                          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                      </div>
                      {form.role === 'doctor' && (
                        <>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Specialty</label>
                            <input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                              className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="e.g. Cardiology" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Schedule</label>
                            <input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })}
                              className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="e.g. Mon–Fri 08:00–17:00" />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">
                          New Password <span className="normal-case font-normal text-gray-400">(leave blank to keep current)</span>
                        </label>
                        <div className="relative mt-1">
                          <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                            className="w-full bg-surface-50 rounded-xl py-3 px-4 pr-10 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="New password" />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-sm text-gray-500">
                        Grant extra privileges beyond the default{' '}
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${getRoleInfo(form.role).color}`}>
                          {getRoleInfo(form.role).label}
                        </span>{' '}
                        access level.
                      </p>
                      {PERMISSION_GROUPS.map(group => (
                        <div key={group.group}>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{group.group}</p>
                          <div className="space-y-2">
                            {group.permissions.map(perm => (
                              <label
                                key={perm.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  className="w-4 h-4 accent-teal-500 flex-shrink-0"
                                />
                                <span className="text-sm font-medium text-gray-700 flex-1">{perm.label}</span>
                                {form.permissions.includes(perm.id) && (
                                  <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6 mt-4 border-t border-gray-100 flex-shrink-0">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 font-bold text-slate-500 bg-surface-50 rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 font-bold text-white bg-primary-500 rounded-xl disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-sm p-8 text-center"
            >
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Staff Member?</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-bold text-gray-700">{deleteTarget.name}</span> will be permanently removed from the system.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 font-bold text-slate-500 bg-gray-100 rounded-xl">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Remove</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
