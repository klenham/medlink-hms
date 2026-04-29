import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Users, Stethoscope, Building2,
  CalendarDays, Package, MessageSquare, LogOut, Bell, Search,
  BarChart3, UserCog, ChevronDown, X, Settings as SettingsIcon, Clock,
  Moon, Sun, FlaskConical, CheckCheck,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useInactivityLogout } from '../hooks/useInactivityLogout';
import { getSettings, saveSettings, applySettings } from '../lib/settings';

export default function Layout({
  user,
  onLogout,
  inactivityTimeout,
}: {
  user: any;
  onLogout: () => void;
  inactivityTimeout: number;
}) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [notifTab, setNotifTab]       = useState<'lab' | 'notices'>('lab');
  const [notices, setNotices]         = useState<any[]>([]);
  const [labNotifs, setLabNotifs]     = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  /* ─── Inactivity auto-logout ─── */
  const { secsLeft, dismiss } = useInactivityLogout(inactivityTimeout, onLogout);

  /* ─── Dark mode toggle ─── */
  const [darkMode, setDarkMode] = useState(() => getSettings().darkMode);
  const toggleDark = () => {
    const next = saveSettings({ darkMode: !darkMode });
    applySettings(next);
    setDarkMode(next.darkMode);
  };

  const handleLogout = () => {
    onLogout();
    window.location.replace('/');
  };

  /* ─── Fetch notices for bell ─── */
  useEffect(() => {
    fetch('/api/admin/notices', { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNotices(d); })
      .catch(() => {});
  }, []);

  /* ─── Lab notifications + SSE (doctors only) ─── */
  useEffect(() => {
    if (user.role !== 'doctor') return;
    const token = sessionStorage.getItem('token');

    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLabNotifs(d); })
      .catch(() => {});

    const es = new EventSource(`/api/notifications/stream?token=${token}`);
    es.addEventListener('lab_result', (e: MessageEvent) => {
      const notif = JSON.parse(e.data);
      setLabNotifs(prev => {
        const idx = prev.findIndex((n: any) => n.id === notif.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = notif;
          return updated;
        }
        return [notif, ...prev];
      });
      toast.message(notif.title, {
        description: notif.body,
        icon: '🧪',
        duration: 8000,
      });
    });
    es.onerror = () => es.close();
    return () => es.close();
  }, [user.role]);

  /* ─── Debounced patient search ─── */
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?q=${encodeURIComponent(searchQuery)}&limit=6`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        });
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : (data.patients || []));
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ─── Close search on outside click ─── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard',    roles: ['all'] },
    { icon: CalendarCheck,   label: 'Appointments', path: '/appointments', roles: ['admin', 'nurse', 'doctor'] },
    { icon: Users,           label: 'Patients',     path: '/patients',     roles: ['admin', 'nurse', 'doctor'] },
    { icon: Stethoscope,     label: 'Doctors',      path: '/doctors',      roles: ['admin'] },
    { icon: Building2,       label: 'Departments',  path: '/departments',  roles: ['admin'] },
    { icon: CalendarDays,    label: 'Calendar',     path: '/calendar',     roles: ['admin', 'doctor'] },
    { icon: Package,         label: 'Inventory',    path: '/inventory',    roles: ['admin', 'pharmacist'] },
    { icon: MessageSquare,   label: 'Messages',     path: '/messages',     roles: ['all'] },
    { icon: BarChart3,       label: 'Analysis',     path: '/analysis',     roles: ['admin'] },
    { icon: UserCog,         label: 'Staff',        path: '/staff',        roles: ['admin'] },
    { icon: SettingsIcon,    label: 'Settings',     path: '/settings',     roles: ['all'] },
  ];

  const navItems = allNavItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6">
      {/* ─── Inactivity warning banner ─── */}
      {secsLeft !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
          <div className="bg-amber-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">
              You'll be logged out due to inactivity in{' '}
              <strong className="font-black text-base">{secsLeft}s</strong>
            </span>
            <button
              onClick={dismiss}
              className="bg-white/25 hover:bg-white/40 px-3 py-1 rounded-xl text-sm font-bold transition-colors"
            >
              Stay logged in
            </button>
          </div>
        </div>
      )}

      {/* ─── Sidebar ─── */}
      <aside className="w-72 glass rounded-3xl flex flex-col p-6 overflow-hidden">
        {/* Logo */}
        <div
          className="flex items-center gap-3 mb-8 px-2 cursor-pointer flex-shrink-0"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: 'var(--color-primary-500)' }}>H+</div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">Medlink</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn('sidebar-link', isActive && 'sidebar-link-active')}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="flex-shrink-0 mt-4 glass-dark p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=cbd5e1&color=0f172a`}
              className="w-8 h-8 rounded-full flex-shrink-0"
              alt="avatar"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-700 truncate">{user.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-800/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col overflow-hidden gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-6 z-20">

          {/* Search */}
          <div className="flex-1 max-w-xl relative" ref={searchRef}>
            <div className="glass px-5 py-3 rounded-2xl flex items-center gap-3 focus-within:bg-white/60 transition-all">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                placeholder="Search patients by name or ID..."
                className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search dropdown */}
            {showSearch && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl shadow-xl z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="px-5 py-5 text-sm text-slate-400 text-center">No patients found for "{searchQuery}"</div>
                ) : (
                  <>
                    <div className="py-1">
                      {searchResults.map((p: any) => (
                        <button
                          key={p.id || p._id}
                          onClick={() => { navigate('/patients'); setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0" style={{ backgroundColor: 'var(--color-primary-50)' }}>
                            {(p.name || p.surname || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 truncate">
                              {[p.name, p.surname].filter(Boolean).join(' ')}
                            </p>
                            <p className="text-xs text-slate-400">{p.patient_id} · {p.gender || ''}</p>
                          </div>
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                            p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            p.status === 'seen'    ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-500'
                          )}>
                            {p.status || 'registered'}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 px-4 py-2.5">
                      <button
                        onClick={() => { navigate('/patients'); setSearchQuery(''); setShowSearch(false); }}
                        className="text-xs font-bold text-primary-600 hover:underline"
                      >
                        View all patients →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Date */}
            <div className="glass px-4 py-2 rounded-2xl text-slate-600 text-sm font-medium whitespace-nowrap">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>

            {/* Dark / light mode toggle */}
            <button
              onClick={toggleDark}
              className="glass w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 hover:text-primary-600 transition-all"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Bell */}
            {(() => {
              const unreadLab = labNotifs.filter((n: any) => !n.read).length;
              const totalBadge = notices.length > 0 || unreadLab > 0;
              const isDoctor = user.role === 'doctor';

              const markAllRead = async () => {
                await fetch('/api/notifications/read-all', {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
                });
                setLabNotifs(prev => prev.map(n => ({ ...n, read: true })));
              };

              const markOneRead = async (id: string) => {
                await fetch(`/api/notifications/${id}/read`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
                });
                setLabNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
              };

              return (
                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(o => !o); setNotifTab(isDoctor ? 'lab' : 'notices'); }}
                    className="glass w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 hover:text-primary-600 transition-all relative"
                  >
                    <Bell className="w-5 h-5" />
                    {totalBadge && (
                      <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[8px] font-black rounded-full ring-2 ring-white flex items-center justify-center">
                        {isDoctor ? (unreadLab > 0 ? unreadLab : '') : ''}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-96 glass-card rounded-2xl shadow-xl z-40 overflow-hidden">

                        {/* Tabs (doctors only) */}
                        {isDoctor ? (
                          <>
                            <div className="flex border-b border-gray-100">
                              <button
                                onClick={() => setNotifTab('lab')}
                                className={cn(
                                  'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-wider transition-colors',
                                  notifTab === 'lab' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-600'
                                )}
                              >
                                <FlaskConical className="w-3.5 h-3.5" />
                                Lab Alerts
                                {unreadLab > 0 && (
                                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadLab}</span>
                                )}
                              </button>
                              <button
                                onClick={() => setNotifTab('notices')}
                                className={cn(
                                  'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-wider transition-colors',
                                  notifTab === 'notices' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-600'
                                )}
                              >
                                <Bell className="w-3.5 h-3.5" />
                                Notices
                              </button>
                            </div>

                            {notifTab === 'lab' && (
                              <>
                                <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{labNotifs.length} total · {unreadLab} unread</p>
                                  {unreadLab > 0 && (
                                    <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] font-black text-primary-600 hover:underline">
                                      <CheckCheck className="w-3 h-3" /> Mark all read
                                    </button>
                                  )}
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                  {labNotifs.length === 0 ? (
                                    <p className="px-5 py-6 text-sm text-slate-400 text-center">No lab results yet.</p>
                                  ) : labNotifs.map((n: any) => (
                                    <div
                                      key={n.id}
                                      onClick={() => !n.read && markOneRead(n.id)}
                                      className={cn(
                                        'px-5 py-3.5 cursor-pointer transition-colors',
                                        n.read ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                                      )}
                                    >
                                      <div className="flex items-start gap-2 mb-1">
                                        {!n.read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-black text-slate-800">{n.title}</p>
                                          <p className="text-xs text-slate-600 mt-0.5 leading-snug">{n.body}</p>
                                          {Array.isArray(n.detail?.results) ? (
                                            <div className="mt-1.5 space-y-1">
                                              {n.detail.results.map((r: any, i: number) => (
                                                <div key={i} className="bg-white/80 rounded-lg px-3 py-2 border border-blue-100/60">
                                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{r.test_type}</p>
                                                  <p className="text-xs font-bold text-slate-800">{r.result}</p>
                                                </div>
                                              ))}
                                            </div>
                                          ) : n.detail?.result && (
                                            <div className="mt-1.5 bg-white/80 rounded-lg px-3 py-2 border border-blue-100/60">
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{n.detail.test_type || 'Result'}</p>
                                              <p className="text-xs font-bold text-slate-800">{n.detail.result}</p>
                                            </div>
                                          )}
                                          <p className="text-[10px] text-slate-400 mt-1.5">
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {notifTab === 'notices' && (
                              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                {notices.length === 0 ? (
                                  <p className="px-5 py-6 text-sm text-slate-400 text-center">No notices at the moment.</p>
                                ) : notices.slice(0, 6).map((n: any) => (
                                  <div key={n.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <p className="text-sm font-bold text-slate-800 truncate">{n.title}</p>
                                      <span className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                                        n.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                                        n.type === 'event'   ? 'bg-blue-100 text-blue-700' :
                                        'bg-primary-50 text-primary-700'
                                      )}>{n.type}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2">{n.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          /* Non-doctors: just notices */
                          <>
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                              <h4 className="font-bold text-slate-800">Hospital Notices</h4>
                              <span className="text-xs font-bold text-slate-400">{notices.length} total</span>
                            </div>
                            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                              {notices.length === 0 ? (
                                <p className="px-5 py-6 text-sm text-slate-400 text-center">No notices at the moment.</p>
                              ) : notices.slice(0, 6).map((n: any) => (
                                <div key={n.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <p className="text-sm font-bold text-slate-800 truncate">{n.title}</p>
                                    <span className={cn(
                                      'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                                      n.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                                      n.type === 'event'   ? 'bg-blue-100 text-blue-700' :
                                      'bg-primary-50 text-primary-700'
                                    )}>{n.type}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 line-clamp-2">{n.content}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-3 glass px-4 py-1.5 rounded-2xl hover:bg-white/60 transition-all"
              >
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800 leading-tight">{user.name}</div>
                  <div className="text-[10px] font-bold text-primary-600 uppercase tracking-widest leading-none mt-0.5">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=14b8a6&color=fff`}
                  alt="Profile"
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 glass-card rounded-2xl shadow-xl z-40 overflow-hidden py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserCog className="w-4 h-4" />
                      Edit Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-gray-50 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      Settings
                    </Link>
                    <div className="mx-4 border-t border-gray-100" />
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
