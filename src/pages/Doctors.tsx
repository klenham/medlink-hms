import { useEffect, useState } from 'react';
import {
  Stethoscope, Clock, MessageSquare, Plus, Search, UserX,
  ChevronLeft, ChevronRight, MoreHorizontal, User, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
  format, startOfWeek, addDays, isSameDay, isToday, addWeeks, subWeeks,
} from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Semi-circle performance gauge ─── */
function SemiGauge({ pct }: { pct: number }) {
  const r = 52, cx = 68, cy = 56;
  const arc = Math.PI * r;
  const filled = Math.min(Math.max(pct, 0), 100) / 100 * arc;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg width="136" height="60" viewBox="0 0 136 60" className="mx-auto">
      <path d={d} fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#14b8a6" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${filled} ${arc}`} />
    </svg>
  );
}

/* ─── Info row helper ─── */
function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
    </div>
  );
}

/* ─── Doctor detail view ─── */
function DoctorDetail({ doctor, onBack }: { doctor: any; onBack: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [weekBase, setWeekBase] = useState(new Date());

  useEffect(() => {
    fetch(`/api/admin/doctors/${doctor.id || doctor._id}/stats`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d); })
      .catch(() => {});
  }, [doctor.id, doctor._id]);

  /* Build week days for schedule panel */
  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 }); // Mon
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* Appointment dates in upcoming */
  const upcomingDates: Date[] = (stats?.upcoming || []).map((a: any) => new Date(a.date));
  const hasAppt = (day: Date) => upcomingDates.some(d => isSameDay(d, day));

  /* Build chart data */
  const scheduledData = Array(7).fill(0);
  const completedData = Array(7).fill(0);
  (stats?.by_day || []).forEach((d: any) => {
    const idx = (d._id.day - 1 + 7) % 7; // MongoDB $dayOfWeek: 1=Sun
    if (d._id.status === 'scheduled') scheduledData[idx] = d.count;
    if (d._id.status === 'completed') completedData[idx] = d.count;
  });

  const chartData = {
    labels: DAY_LABELS,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Scheduled',
        data: scheduledData,
        backgroundColor: 'rgba(20,184,166,0.18)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        type: 'line' as const,
        label: 'Completed',
        data: completedData,
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20,184,166,0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#14b8a6',
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' as const } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
    },
  };

  const drId = `#DR-${(doctor.id || doctor._id || '').slice(-4).toUpperCase()}`;
  const joinDate = doctor.createdAt ? format(new Date(doctor.createdAt), 'dd MMMM yyyy') : '—';
  const isAvailable = doctor.availability !== 'unavailable';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={onBack} className="text-teal-600 font-bold hover:underline">Doctors</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500 font-medium">Doctor Details</span>
      </div>

      <div className="flex gap-6 items-start">
        {/* ─── Left panel ─── */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-5">
          {/* Doctor card */}
          <div className="glass-card overflow-hidden">
            <div className="h-36 bg-gradient-to-br from-teal-50 to-teal-100 relative flex items-center justify-center">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=effafa&color=46a2a2&size=100`}
                alt={doctor.name}
                className="w-24 h-24 rounded-2xl shadow-lg border-4 border-white"
              />
            </div>
            <div className="px-4 pb-6 pt-3 text-center">
              <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{drId}</span>
              <h2 className="text-base font-bold text-gray-900 mt-2 leading-tight">{doctor.name}</h2>
              <p className="text-xs text-primary-600 font-bold uppercase tracking-wider mt-0.5 mb-3">
                {doctor.specialty || 'General Medicine'}
              </p>
              <div className="flex justify-between text-[11px] text-gray-400 mb-3">
                <span>{doctor.experience || 'N/A'}</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Appointment Schedule */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">Appointment Schedule</h3>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setWeekBase(subWeeks(weekBase, 1))} className="p-1 rounded-lg hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-[11px] font-semibold text-gray-500">
                {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d')}
              </span>
              <button onClick={() => setWeekBase(addWeeks(weekBase, 1))} className="p-1 rounded-lg hover:bg-gray-100">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center py-1.5 rounded-lg text-[10px] font-bold relative ${
                    isToday(day) ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{format(day, 'EEE').charAt(0)}</span>
                  <span className="mt-0.5">{format(day, 'd')}</span>
                  {hasAppt(day) && !isToday(day) && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-teal-400" />
                  )}
                </div>
              ))}
            </div>
            {stats?.upcoming?.length > 0 && (
              <div className="mt-3 space-y-2">
                {stats.upcoming.slice(0, 3).map((appt: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                    <span className="truncate">{appt.patient?.name || 'Patient'}</span>
                    <span className="ml-auto text-gray-400 flex-shrink-0">{format(new Date(appt.date), 'MMM d')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Center panel ─── */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* About */}
          <div className="glass-card p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">About</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {doctor.bio || 'No bio provided. The doctor can add a bio from their profile settings.'}
            </p>
          </div>

          {/* Contact info grid */}
          <div className="glass-card p-5">
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <InfoCell label="Room / Office" value={doctor.room} />
              <InfoCell label="Phone Number" value={doctor.phone} />
              <InfoCell label="Email" value={doctor.email} />
              <InfoCell label="Joined" value={joinDate} />
              <InfoCell
                label="Emergency Contact"
                value={[doctor.emergency_contact_name, doctor.emergency_contact_phone].filter(Boolean).join(' · ')}
              />
              <InfoCell label="Address" value={doctor.address} />
            </div>
          </div>

          {/* Patient Overview chart */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-sm">Patient Overview</h3>
              <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-200 inline-block" /> Scheduled
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Completed
                </span>
                <span className="text-gray-300 text-[10px] font-medium">Last 7 days</span>
              </div>
            </div>
            <div className="h-44">
              <Chart type="bar" data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* ─── Right panel ─── */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-4">
          {/* Performance gauge */}
          <div className="glass-card p-5 text-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Performance</h3>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>
            <SemiGauge pct={stats?.performance ?? 0} />
            <div className="text-3xl font-bold text-gray-900 mt-1">{stats?.performance ?? 0}%</div>
            <div className="text-[11px] text-gray-400 mt-1">
              {stats?.total_patients ?? 0} patients treated
            </div>
            <div className="text-[11px] text-teal-600 font-bold mt-1">Satisfied Range</div>
          </div>

          {/* Total Appointments */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-teal-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Appointments</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats?.total_appointments ?? 0}</div>
            <div className="text-[11px] text-gray-400 mt-1">All time</div>
          </div>

          {/* Total Patients */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-teal-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Patients</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats?.total_patients ?? 0}</div>
            <div className="text-[11px] text-gray-400 mt-1">Unique patients seen</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Doctors page ─── */
export default function Doctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.filter((u: any) => u.role === 'doctor'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify({ ...form, role: 'doctor' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Doctor account created. They can complete their profile after login.');
      setShowModal(false);
      setForm({ name: '', email: '', password: '' });
      fetchDoctors();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialty || '').toLowerCase().includes(search.toLowerCase())
  );

  /* Show doctor detail view */
  if (selectedDoctor) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <DoctorDetail doctor={selectedDoctor} onBack={() => setSelectedDoctor(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctors</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and manage hospital medical staff.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
        >
          <Plus className="w-5 h-5" /> Add New Doctor
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or specialty..."
          className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary-500/10 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => <div key={i} className="glass-card h-64 animate-pulse bg-gray-50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <UserX className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No doctors found.</p>
          <p className="text-sm text-gray-400 mt-1">Add a doctor using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((doctor) => (
            <div key={doctor.id || doctor._id} className="glass-card group hover:ring-2 hover:ring-primary-500/10 transition-all">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=effafa&color=46a2a2&size=80`}
                      alt={doctor.name}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${doctor.availability !== 'unavailable' && doctor.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900">{doctor.name}</h3>
                <p className="text-primary-600 font-bold text-xs uppercase tracking-widest mt-1 mb-6">
                  {doctor.specialty || 'General Medicine'}
                </p>

                <div className="space-y-4">
                  {doctor.schedule && (
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      {doctor.schedule}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    {doctor.email}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button className="flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-100 text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-all text-xs font-bold">
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                  <button
                    onClick={() => setSelectedDoctor(doctor)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary-50 text-primary-600 font-bold text-xs hover:bg-primary-100 transition-all"
                  >
                    Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl rounded-3xl w-full max-w-md flex flex-col"
              style={{ maxHeight: '90vh' }}>
              <div className="px-8 pt-8 pb-4 flex-shrink-0">
                <h2 className="text-2xl font-bold">Add New Doctor</h2>
                <p className="text-sm text-gray-400 mt-1">Creates an account. The doctor completes their profile after login.</p>
              </div>
              <div className="flex-1 overflow-y-auto px-8 pb-2">
                <form id="add-doctor-form" onSubmit={handleAdd} className="space-y-4" autoComplete="off">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                    <input required autoComplete="off" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="Dr. John Doe" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                    <input required type="email" autoComplete="off" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="doctor@clinic.com" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                    <input required type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                      className="w-full bg-surface-50 rounded-xl py-3 px-4 mt-1 outline-none focus:ring-2 focus:ring-primary-500 border-none" placeholder="Secure temporary password" />
                  </div>
                </form>
              </div>
              <div className="px-8 py-6 flex-shrink-0 flex gap-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-slate-500 bg-surface-50 rounded-xl">Cancel</button>
                <button type="submit" form="add-doctor-form" disabled={saving} className="flex-1 py-3 font-bold text-white bg-primary-500 rounded-xl">
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
