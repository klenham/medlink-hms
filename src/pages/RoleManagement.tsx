import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function RoleManagement() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissionIds: [] as string[]
  });

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/roles', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } }),
        fetch('/api/roles/permissions', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
    const method = editingRole ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify(newRole)
    });

    if (res.ok) {
      toast.success(`Role ${editingRole ? 'updated' : 'created'} successfully`);
      setShowRoleModal(false);
      setEditingRole(null);
      setNewRole({ name: '', description: '', permissionIds: [] });
      fetchData();
    } else {
      toast.error('Failed to save role');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    const res = await fetch(`/api/roles/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });
    if (res.ok) {
      toast.success('Role deleted');
      fetchData();
    }
  };

  const togglePermission = (permId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter(id => id !== permId)
        : [...prev.permissionIds, permId]
    }));
  };

  if (loading) return <div className="flex items-center justify-center p-20">Loading roles...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Define system access levels and user capabilities.</p>
        </div>
        <button 
          onClick={() => {
            setEditingRole(null);
            setNewRole({ name: '', description: '', permissionIds: [] });
            setShowRoleModal(true);
          }}
          className="bg-primary-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="glass p-6 rounded-3xl flex flex-col group hover:border-primary-200 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    setEditingRole(role);
                    setNewRole({
                      name: role.name,
                      description: role.description,
                      permissionIds: role.permissions.map((p: any) => p.id)
                    });
                    setShowRoleModal(true);
                  }}
                  className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {role.id !== 'admin' && (
                  <button 
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-1 capitalize">{role.name}</h3>
            <p className="text-xs text-slate-500 mb-4 h-8 line-clamp-2">{role.description}</p>
            
            <div className="space-y-2 mt-auto">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                <span>Active Permissions</span>
                <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{role.permissions.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {role.permissions.slice(0, 3).map((p: any) => (
                  <span key={p.id} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {p.name.replace('_', ' ')}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded-md">
                    +{role.permissions.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full max-w-2xl p-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{editingRole ? 'Edit Role' : 'Create Custom Role'}</h2>
                  <p className="text-sm text-slate-500">Configure access level and individual permissions.</p>
                </div>
                <button onClick={() => setShowRoleModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveRole} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Role Name</label>
                    <input 
                      type="text" 
                      required
                      value={newRole.name}
                      onChange={e => setNewRole({...newRole, name: e.target.value})}
                      placeholder="e.g. Senior Nurse"
                      className="w-full glass bg-white/40 border-none rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Short Description</label>
                    <input 
                      type="text"
                      required
                      value={newRole.description}
                      onChange={e => setNewRole({...newRole, description: e.target.value})}
                      placeholder="Brief role responsibility"
                      className="w-full glass bg-white/40 border-none rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">Define Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map(perm => (
                      <div 
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={cn(
                          "p-4 rounded-2xl cursor-pointer transition-all border flex items-center justify-between group",
                          newRole.permissionIds.includes(perm.id) 
                            ? "bg-primary-500/10 border-primary-500/30 ring-1 ring-primary-500/10 text-primary-900" 
                            : "bg-slate-50 border-transparent text-slate-600 hover:bg-white hover:shadow-md"
                        )}
                      >
                        <div className="flex-1">
                          <div className={cn("text-xs font-bold capitalize", newRole.permissionIds.includes(perm.id) ? "text-primary-700" : "text-slate-700")}>
                            {perm.name.replace('_', ' ')}
                          </div>
                          <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">{perm.description}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                          newRole.permissionIds.includes(perm.id) ? "bg-primary-500 text-white" : "bg-slate-200 text-transparent"
                        )}>
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowRoleModal(false)}
                    className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary-500 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 hover:bg-primary-600 transition-all"
                  >
                    {editingRole ? 'Update Changes' : 'Create Role'}
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