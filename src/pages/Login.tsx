import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserCircle, Shield, Stethoscope, Pill as Pills, Beaker, Banknote, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const roles = [
  { id: 'admin',          label: 'Admin',          icon: Shield },
  { id: 'doctor',         label: 'Doctor',         icon: Stethoscope },
  { id: 'nurse',          label: 'Nurse',          icon: UserCircle },
  { id: 'pharmacist',     label: 'Pharmacist',     icon: Pills },
  { id: 'lab_technician', label: 'Lab Technician', icon: Beaker },
  { id: 'accounts',       label: 'Cashier',        icon: Banknote },
];

export default function Login({ onLogin }: { onLogin: (data: any) => void }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPw, setShowPw]             = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      toast.success('Login successful', { description: `Welcome back, ${data.user.name}` });
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Login failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Left decoration */}
      <div className="hidden lg:flex w-1/2 bg-primary-100/30 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-12 left-12 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
          </div>
          <span className="text-xl font-bold text-gray-800">MediCare</span>
        </div>
        <div className="z-10 text-center max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Stay on Top of Every Detail
          </motion.h1>
          <p className="text-gray-500">From appointments to inventory, MediCare gives you a clear view of daily hospital operations in real time.</p>
          <div className="mt-12 scale-110 shadow-2xl rounded-2xl overflow-hidden border-8 border-white">
            <img src="https://images.unsplash.com/photo-1540339832862-4745591f5d13?q=80&w=1000&auto=format&fit=crop" alt="Dashboard Preview" className="w-full opacity-90" />
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back to MediCare</h2>
            <p className="text-gray-500 mt-2">Sign in to continue managing patients and operations.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                    selectedRole === role.id
                      ? 'border-primary-500 bg-primary-50 text-primary-600 ring-4 ring-primary-500/10'
                      : 'border-gray-100 text-gray-400 hover:border-primary-200'
                  }`}
                >
                  <role.icon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium whitespace-nowrap">{role.label}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                Remember Me
              </label>
              <a href="#" className="text-primary-600 font-medium hover:underline">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 active:scale-[0.98]"
            >
              {loading ? 'Logging in...' : <><LogIn className="w-5 h-5" /> Login</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
