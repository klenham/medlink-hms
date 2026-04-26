import { useEffect, useState } from 'react';
import { User, Lock, Eye, EyeOff, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  admin:          'Administrator',
  doctor:         'Doctor',
  nurse:          'Nurse',
  pharmacist:     'Pharmacist',
  lab_technician: 'Lab Technician',
  accounts:       'Accounts / Cashier',
};

const EMPTY_PROFILE = {
  name: '', specialty: '', schedule: '', phone: '', room: '',
  address: '', bio: '', emergency_contact_name: '', emergency_contact_phone: '',
  experience: '', availability: 'available',
};

export default function Profile({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [tab, setTab] = useState<'info' | 'password'>('info');

  const isDoctor = user.role === 'doctor';

  useEffect(() => {
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setProfile({
            name: data.name || '',
            specialty: data.specialty || '',
            schedule: data.schedule || '',
            phone: data.phone || '',
            room: data.room || '',
            address: data.address || '',
            bio: data.bio || '',
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
            experience: data.experience || '',
            availability: data.availability || 'available',
          });
        }
      });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      const updatedUser = { ...user, name: data.name };
      setUser(updatedUser);
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ current_password: passwords.current, new_password: passwords.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      toast.success('Password changed successfully');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  const toggle = (field: keyof typeof showPw) =>
    setShowPw(s => ({ ...s, [field]: !s[field] }));

  const field = (label: string, key: keyof typeof profile, opts?: { placeholder?: string; type?: string; textarea?: boolean }) => (
    <div key={key}>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {opts?.textarea ? (
        <textarea
          rows={3}
          value={profile[key] as string}
          onChange={e => setProfile({ ...profile, [key]: e.target.value })}
          className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none resize-none"
          placeholder={opts.placeholder}
        />
      ) : (
        <input
          type={opts?.type || 'text'}
          value={profile[key] as string}
          onChange={e => setProfile({ ...profile, [key]: e.target.value })}
          className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
          placeholder={opts?.placeholder}
        />
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-6 mb-10">
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=14b8a6&color=fff&size=80`}
          className="w-20 h-20 rounded-2xl"
          alt={user.name}
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm font-bold text-teal-600 uppercase tracking-widest mt-0.5">
            {ROLE_LABELS[user.role] || user.role}
          </p>
          <p className="text-sm text-gray-400 mt-1">{user.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8">
        <button
          onClick={() => setTab('info')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${tab === 'info' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          <User className="w-4 h-4" /> Profile Info
        </button>
        <button
          onClick={() => setTab('password')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${tab === 'password' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          <Lock className="w-4 h-4" /> Change Password
        </button>
      </div>

      {tab === 'info' ? (
        <form onSubmit={handleSaveProfile} className="glass-card p-8 space-y-5">
          {/* All roles */}
          {field('Full Name', 'name', { placeholder: 'Your full name' })}

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Role</label>
            <div className="w-full bg-gray-50 rounded-xl py-3 px-4 mt-1 text-sm text-gray-400 font-medium cursor-not-allowed select-none">
              {ROLE_LABELS[user.role] || user.role}
              <span className="ml-2 text-xs text-gray-300">(contact admin to change)</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Details</p>
            <div className="space-y-5">
              {field('Phone Number', 'phone', { placeholder: '0XX XXX XXXX', type: 'tel' })}
              <div className="grid grid-cols-2 gap-4">
                {field('Emergency Contact — Name', 'emergency_contact_name', { placeholder: 'Contact person name' })}
                {field('Emergency Contact — Phone', 'emergency_contact_phone', { placeholder: '0XX XXX XXXX', type: 'tel' })}
              </div>
            </div>
          </div>

          {/* Doctor-only fields */}
          {isDoctor && (
            <>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Professional Details</p>
                <div className="space-y-5">
                  {field('Specialty', 'specialty', { placeholder: 'e.g. Cardiology, Pediatrics' })}
                  {field('Experience', 'experience', { placeholder: 'e.g. 11+ years' })}
                  {field('Work Schedule', 'schedule', { placeholder: 'e.g. Mon–Fri 08:00–17:00' })}

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Availability</label>
                    <select
                      value={profile.availability}
                      onChange={e => setProfile({ ...profile, availability: e.target.value })}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>

                  {field('Bio / About', 'bio', { placeholder: 'A short bio about you...', textarea: true })}

                  <div className="grid grid-cols-2 gap-4">
                    {field('Room / Office', 'room', { placeholder: 'e.g. Room D-204' })}
                    {field('Address', 'address', { placeholder: 'Office or clinic address' })}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingProfile ? 'Saving...' : <><Save className="w-4 h-4" /> Save Profile</>}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleChangePassword} className="glass-card p-8 space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 font-medium">
            Choose a strong password. You will need it to log in next time.
          </div>

          {(['current', 'next', 'confirm'] as const).map(f => (
            <div key={f}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {f === 'current' ? 'Current Password' : f === 'next' ? 'New Password' : 'Confirm New Password'}
              </label>
              <div className="relative mt-1">
                <input
                  required
                  type={showPw[f] ? 'text' : 'password'}
                  value={passwords[f]}
                  onChange={e => setPasswords({ ...passwords, [f]: e.target.value })}
                  className="w-full bg-surface-50 rounded-xl py-3 px-4 pr-10 outline-none focus:ring-2 focus:ring-primary-500 border-none"
                  placeholder={f === 'current' ? 'Your current password' : f === 'next' ? 'Min 6 characters' : 'Repeat new password'}
                />
                <button
                  type="button"
                  onClick={() => toggle(f)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw[f] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {f === 'confirm' && passwords.confirm && passwords.next !== passwords.confirm && (
                <p className="text-xs text-red-500 mt-1 font-medium">Passwords do not match</p>
              )}
              {f === 'confirm' && passwords.confirm && passwords.next === passwords.confirm && passwords.confirm.length > 0 && (
                <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>
          ))}

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPw || passwords.next !== passwords.confirm || !passwords.current}
              className="w-full py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingPw ? 'Updating...' : <><Lock className="w-4 h-4" /> Update Password</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
