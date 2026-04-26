/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import Inventory from './pages/Inventory';
import Analysis from './pages/Analysis';
import Staff from './pages/Staff';
import Profile from './pages/Profile';
import SettingsPage from './pages/Settings';
import Layout from './components/Layout';
import { Toaster } from 'sonner';
import { getSettings, applySettings, AppSettings } from './lib/settings';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState(() => getSettings().inactivityTimeout);

  useEffect(() => {
    // Apply saved appearance settings on startup
    applySettings(getSettings());

    const savedUser = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');
    if (savedUser && token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (r.ok) setUser(JSON.parse(savedUser));
          else sessionStorage.clear();
        })
        .catch(() => sessionStorage.clear())
        .finally(() => setLoading(false));
    } else {
      sessionStorage.clear();
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData.user);
    sessionStorage.setItem('token', userData.token);
    sessionStorage.setItem('user', JSON.stringify(userData.user));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.clear();
  };

  const handleSettingsSave = (s: AppSettings) => {
    setInactivityTimeout(s.inactivityTimeout);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-primary-500">Medlink Loading...</div>;

  return (
    <Router>
      <Toaster position="top-right" expand={false} richColors closeButton />
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />

        <Route element={user ? <Layout user={user} onLogout={handleLogout} inactivityTimeout={inactivityTimeout} /> : <Navigate to="/" replace />}>
          <Route path="/dashboard"    element={<Dashboard user={user} />} />
          <Route path="/profile"      element={<Profile user={user} setUser={setUser} />} />
          <Route path="/settings"     element={<SettingsPage onSave={handleSettingsSave} />} />
          <Route path="/patients"     element={<Patients />} />
          <Route path="/doctors"      element={<Doctors />} />
          <Route path="/inventory"    element={<Inventory />} />
          <Route path="/analysis"     element={<Analysis />} />
          <Route path="/staff"        element={<Staff />} />
          <Route path="/appointments" element={<div className="p-8">Appointments Module - Coming Soon</div>} />
          <Route path="/departments"  element={<div className="p-8">Departments Module - Coming Soon</div>} />
          <Route path="/calendar"     element={<div className="p-8">Calendar Module - Coming Soon</div>} />
          <Route path="/messages"     element={<div className="p-8">Messages Module - Coming Soon</div>} />
        </Route>

        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
      </Routes>
    </Router>
  );
}
