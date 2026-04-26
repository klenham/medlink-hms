import { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Users, CalendarCheck, TrendingUp, ChevronLeft, ChevronRight,
  MoreHorizontal, UserCheck, UserX, Activity,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay } from 'date-fns';
import { cn } from '../lib/utils';
import Patients from './Patients';
import DoctorDashboard from '../components/DoctorDashboard';
import Pharmacy from './Pharmacy';
import { LabDashboard, AccountsDashboard, NurseDashboard } from '../components/RoleDashboards';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEPT_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function timeAgo(date: string | Date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard({ user }: { user: any }) {
  if (user.role === 'nurse')         return <NurseDashboard />;
  if (user.role === 'doctor')        return <DoctorDashboard user={user} />;
  if (user.role === 'pharmacist')    return <Pharmacy />;
  if (user.role === 'lab_technician') return <LabDashboard />;
  if (user.role === 'accounts')      return <AccountsDashboard />;

  return <AdminDashboard user={user} />;
}

function AdminDashboard({ user }: { user: any }) {
  const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0, revenue: 0 });
  const [dash, setDash] = useState<any>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [apptFilter, setApptFilter] = useState<'all' | 'this_week'>('all');

  useEffect(() => {
    const h = { Authorization: `Bearer ${sessionStorage.getItem('token')}` };
    fetch('/api/admin/stats', { headers: h }).then(r => r.json()).then(d => { if (!d.error) setStats(d); });
    fetch('/api/admin/dashboard', { headers: h }).then(r => r.json()).then(d => { if (!d.error) setDash(d); });
  }, []);

  // Build age-by-day chart data
  const ageChartData = (() => {
    const days = DAY_LABELS;
    const groups = ['children', 'teens', 'adults'];
    const colors = ['#14b8a6', '#6366f1', '#f59e0b'];
    const datasets = groups.map((g, i) => ({
      label: g.charAt(0).toUpperCase() + g.slice(1),
      data: days.map((_, di) => {
        const entry = dash?.ageByDay?.find((x: any) => x._id.day === di + 1 && x._id.group === g);
        return entry?.count || 0;
      }),
      backgroundColor: colors[i],
      borderRadius: 6,
      barThickness: 10,
    }));
    return { labels: days, datasets };
  })();

  // Build dept donut data
  const deptChartData = (() => {
    const items: any[] = dash?.deptBreakdown || [];
    if (!items.length) return { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] };
    return {
      labels: items.map((d: any) => d.dept),
      datasets: [{ data: items.map((d: any) => d.count), backgroundColor: DEPT_COLORS, borderWidth: 0 }],
    };
  })();

  // Build revenue line data
  const revenueChartData = (() => {
    const income = Array(12).fill(0);
    const expense = Array(12).fill(0);
    (dash?.revenueByMonth || []).forEach((r: any) => {
      if (r.status === 'paid') income[r.month - 1] += r.total;
      else expense[r.month - 1] += r.total;
    });
    return {
      labels: MONTH_LABELS,
      datasets: [
        { label: 'Income', data: income, borderColor: '#14b8a6', backgroundColor: 'rgba(20,184,166,0.12)', fill: true, tension: 0.4, pointBackgroundColor: '#14b8a6', pointRadius: 3 },
        { label: 'Expense', data: expense, borderColor: '#334155', backgroundColor: 'rgba(51,65,85,0.06)', fill: true, tension: 0.4, pointBackgroundColor: '#334155', pointRadius: 3 },
      ],
    };
  })();

  // Calendar days
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const appts: any[] = dash?.recentAppts || [];
  const todayAppts = appts.filter(a => isSameDay(new Date(a.date), new Date()));
  const upcoming = [...appts].filter(a => new Date(a.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 4);

  // Filter appointments table
  const filteredAppts = apptFilter === 'this_week'
    ? appts.filter(a => {
        const d = new Date(a.date);
        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - now.getDay());
        const end = new Date(start); end.setDate(start.getDate() + 6);
        return d >= start && d <= end;
      })
    : appts.slice(0, 10);

  const doctors: any[] = dash?.doctors || [];
  const availDoctors = doctors.filter(d => d.available).length;

  const chartOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.04)' }, border: { dash: [4,4] } } },
  };

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* ── Main Column ── */}
      <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar pb-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">Hello {user.name.split(' ')[0]}, welcome back!</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Overall Visitors"
            value={stats.patients + stats.doctors}
            trend="+8.2%"
            positive
            icon={<Activity className="w-5 h-5 text-teal-500" />}
            color="teal"
          />
          <StatCard
            label="Total Patients"
            value={stats.patients}
            trend="+5.1%"
            positive
            icon={<Users className="w-5 h-5 text-indigo-500" />}
            color="indigo"
          />
          <StatCard
            label="Appointments"
            value={stats.appointments}
            trend="+3.4%"
            positive
            icon={<CalendarCheck className="w-5 h-5 text-amber-500" />}
            color="amber"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-5 gap-4">
          {/* Age Bar Chart */}
          <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Patient by Age Stages</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Last 7 days</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                {['Children', 'Teens', 'Adults'].map((l, i) => (
                  <span key={l} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: ['#14b8a6','#6366f1','#f59e0b'][i] }}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ height: 180 }}>
              <Bar data={ageChartData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} />
            </div>
          </div>

          {/* Dept Donut */}
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Patient by Departments</h3>
              <MoreHorizontal className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex items-center gap-4">
              <div style={{ height: 130, width: 130, flexShrink: 0 }}>
                <Doughnut data={deptChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                {(dash?.deptBreakdown || []).map((d: any, i: number) => (
                  <div key={d.dept} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                      <span className="text-[10px] text-slate-500 font-medium truncate">{d.dept}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 flex-shrink-0">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Revenue</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block"/>Income</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-800 inline-block"/>Expense</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <TrendingUp className="w-3 h-3" /> This Year
            </div>
          </div>
          <div style={{ height: 180 }}>
            <Line data={revenueChartData} options={chartOpts} />
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Patient Appointment</h3>
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
              {(['all', 'this_week'] as const).map(f => (
                <button key={f} onClick={() => setApptFilter(f)}
                  className={cn('px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest', apptFilter === f ? 'bg-white shadow text-slate-800' : 'text-slate-400')}>
                  {f === 'all' ? 'All' : 'This Week'}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Doctor (+ Specialty)</th>
                <th className="px-6 py-3">Appointment Type</th>
                <th className="px-6 py-3">Date &amp; Time</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAppts.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">No appointments found</td></tr>
              )}
              {filteredAppts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{a.patient_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{a.patient_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">{a.doctor_name || '—'}</p>
                    <p className="text-[10px] text-slate-400">{a.doctor_specialty || ''}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 capitalize">{a.type}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{format(new Date(a.date), 'dd MMMM yyyy')}</p>
                    <p className="text-[10px] text-slate-400">{a.time}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full', {
                      'bg-green-50 text-green-600': a.status === 'completed',
                      'bg-teal-50 text-teal-600': a.status === 'scheduled',
                      'bg-red-50 text-red-500': a.status === 'cancelled',
                    })}>
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-slate-300 hover:text-slate-500 transition-colors"><MoreHorizontal className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="w-72 flex-shrink-0 overflow-y-auto no-scrollbar pb-8 space-y-4">
        {/* Mini Calendar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-800">{format(calMonth, 'MMMM yyyy')}</span>
            <div className="flex gap-1">
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-3 h-3 text-slate-400"/></button>
              <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-3 h-3 text-slate-400"/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={`${d}-${i}`} className="text-[9px] font-black text-slate-300 py-1">{d}</div>
            ))}
            {/* Offset padding */}
            {Array(getDay(startOfMonth(calMonth))).fill(null).map((_, i) => <div key={`pad-${i}`}/>)}
            {calDays.map(day => {
              const hasAppt = appts.some(a => isSameDay(new Date(a.date), day));
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toString()} className={cn('aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-colors',
                  isToday ? 'bg-teal-500 text-white' : 'hover:bg-slate-50 text-slate-600',
                  !isSameMonth(day, calMonth) && 'opacity-30'
                )}>
                  {format(day, 'd')}
                  {hasAppt && !isToday && <div className="w-1 h-1 rounded-full bg-teal-400 mt-0.5"/>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Agenda */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800">Agenda</h4>
            <span className="text-[10px] text-teal-500 font-bold">{todayAppts.length} today</span>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="text-[11px] text-slate-400 text-center py-3">No upcoming appointments</p>}
            {upcoming.map((a, i) => (
              <div key={a.id || i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-teal-50 flex flex-col items-center justify-center">
                  <span className="text-[8px] font-black text-teal-500 uppercase">{format(new Date(a.date), 'MMM')}</span>
                  <span className="text-[11px] font-black text-teal-600 leading-none">{format(new Date(a.date), 'd')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                    a.type === 'consultation' ? 'bg-teal-50 text-teal-600' :
                    a.type === 'surgery' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'
                  )}>{a.type}</span>
                  <p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">{a.patient_name}</p>
                  <p className="text-[10px] text-slate-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctors' Schedule */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800">Doctors' Schedule</h4>
            <MoreHorizontal className="w-4 h-4 text-slate-300"/>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <p className="text-xl font-black text-slate-800">{doctors.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">All Doctor</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-teal-500">{availDoctors}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Available</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-red-400">{doctors.length - availDoctors}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Unavailable</p>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
            {doctors.slice(0, 6).map((d, i) => (
              <div key={d.id || i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=e2e8f0&color=475569&size=32`}
                  className="w-8 h-8 rounded-full flex-shrink-0" alt={d.name}/>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-700 truncate">{d.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{d.specialty || 'General'}</p>
                </div>
                <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0',
                  d.available ? 'bg-teal-500 text-white' : 'bg-red-100 text-red-500')}>
                  {d.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            ))}
            {doctors.length === 0 && <p className="text-[11px] text-slate-400 text-center py-2">No doctors registered</p>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800">Recent Activity</h4>
            <MoreHorizontal className="w-4 h-4 text-slate-300"/>
          </div>
          <div className="space-y-3">
            {(dash?.recentActivity || []).map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0',
                  a.type === 'patient' ? 'bg-teal-50 text-teal-500' : 'bg-indigo-50 text-indigo-500')}>
                  {a.type === 'patient' ? <UserCheck className="w-3.5 h-3.5"/> : <Activity className="w-3.5 h-3.5"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">{a.label}</p>
                  {a.sub && <p className="text-[10px] text-slate-400 truncate">{a.sub}</p>}
                </div>
                <span className="text-[9px] text-slate-400 flex-shrink-0 font-medium">{timeAgo(a.time)}</span>
              </div>
            ))}
            {(!dash?.recentActivity || dash.recentActivity.length === 0) && (
              <p className="text-[11px] text-slate-400 text-center py-2">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, positive, icon, color }: {
  label: string; value: number; trend: string; positive: boolean; icon: any; color: string;
}) {
  const bgMap: Record<string, string> = { teal: 'bg-teal-50', indigo: 'bg-indigo-50', amber: 'bg-amber-50' };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bgMap[color] || 'bg-slate-50')}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-slate-800 mb-1">{value.toLocaleString()}</p>
      <p className={cn('text-[10px] font-bold flex items-center gap-1', positive ? 'text-green-500' : 'text-red-400')}>
        <TrendingUp className="w-3 h-3"/> {trend} this month
      </p>
    </div>
  );
}
