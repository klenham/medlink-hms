import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Users, DollarSign, ClipboardList,
  PieChart as PieChartIcon, Activity, ArrowUpRight,
  ArrowDownRight, Loader2, AlertTriangle, Stethoscope,
  BedDouble, FileText, Download, RefreshCw, ShieldCheck
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

const PIPELINE_COLORS: Record<string, string> = {
  triage:       '#f97316',
  consultation: '#14b8a6',
  laboratory:   '#6366f1',
  pharmacy:     '#a855f7',
  billing:      '#10b981',
  discharged:   '#94a3b8',
  unknown:      '#e2e8f0',
};

const ROLE_COLORS = ['#14b8a6','#0f172a','#6366f1','#f97316','#a855f7','#10b981','#94a3b8'];

function StatCard({
  title, value, sub, icon, color, trend, trendLabel
}: {
  title: string; value: string; sub?: string; icon: React.ReactNode;
  color: string; trend?: 'up' | 'down' | 'neutral'; trendLabel?: string;
}) {
  return (
    <div className={cn('glass p-6 rounded-3xl flex flex-col gap-3 border-l-4', color)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <div className="w-9 h-9 rounded-xl bg-white/50 flex items-center justify-center text-slate-500">{icon}</div>
      </div>
      <div>
        <h4 className="text-2xl font-black text-slate-800 leading-none">{value}</h4>
        {sub && <p className="text-[10px] text-slate-400 font-medium mt-1">{sub}</p>}
      </div>
      {trendLabel && (
        <div className={cn('flex items-center gap-1 text-[10px] font-bold',
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

export default function Analysis() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-teal-500 w-10 h-10" />
        <p className="text-slate-400 text-sm font-medium">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-slate-600 font-bold">{error}</p>
        <button onClick={() => load()} className="px-6 py-2 bg-teal-500 text-white rounded-xl font-bold text-sm">Retry</button>
      </div>
    );
  }

  const { summary, visitsByDay, revenueByDay, billingStatus, patientPipeline, roleDistribution, nhisVsPrivate, topDiagnoses } = data;

  /* ── Chart datasets ── */
  const allDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return format(d, 'yyyy-MM-dd');
  });

  const visitMap   = Object.fromEntries(visitsByDay.map((v: any)   => [v.date, v.count]));
  const revenueMap = Object.fromEntries(revenueByDay.map((r: any)  => [r.date, r.revenue]));

  const visitChartData = {
    labels: allDays.map(d => format(new Date(d), 'EEE dd')),
    datasets: [{
      label: 'New Patients',
      data: allDays.map(d => visitMap[d] || 0),
      backgroundColor: 'rgba(20,184,166,0.12)',
      borderColor: '#14b8a6',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#14b8a6',
    }],
  };

  const revenueChartData = {
    labels: allDays.map(d => format(new Date(d), 'EEE dd')),
    datasets: [{
      label: 'Revenue (₵)',
      data: allDays.map(d => revenueMap[d] || 0),
      backgroundColor: 'rgba(99,102,241,0.12)',
      borderColor: '#6366f1',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#6366f1',
    }],
  };

  const billingChartData = {
    labels: billingStatus.map((b: any) => b.status.toUpperCase()),
    datasets: [{
      label: 'Amount (₵)',
      data: billingStatus.map((b: any) => b.total),
      backgroundColor: billingStatus.map((b: any) =>
        b.status === 'paid' ? '#14b8a6' : '#f87171'
      ),
      borderRadius: 10,
      borderWidth: 0,
    }],
  };

  const pipelineChartData = {
    labels: patientPipeline.map((p: any) => p.status.toUpperCase()),
    datasets: [{
      data: patientPipeline.map((p: any) => p.count),
      backgroundColor: patientPipeline.map((p: any) => PIPELINE_COLORS[p.status] || '#e2e8f0'),
      borderWidth: 0,
    }],
  };

  const roleChartData = {
    labels: roleDistribution.map((r: any) => r.role.toUpperCase()),
    datasets: [{
      data: roleDistribution.map((r: any) => r.count),
      backgroundColor: ROLE_COLORS,
      borderWidth: 0,
    }],
  };

  const nhisTotal   = nhisVsPrivate.reduce((a: number, n: any) => a + n.count, 0);
  const nhisEntry   = nhisVsPrivate.find((n: any) => n.type === 'NHIS');
  const nhisPercent = nhisTotal > 0 ? Math.round(((nhisEntry?.count || 0) / nhisTotal) * 100) : 0;

  const chartOpts = (label?: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: label ? { label: (ctx: any) => ` ${ctx.parsed.y?.toLocaleString() ?? ctx.parsed} ${label}` } : {} },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10, weight: 700 } } },
      y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
    },
  });

  const doughnutOpts = { cutout: '72%', plugins: { legend: { display: false } } };

  return (
    <div className="max-w-7xl mx-auto pb-16 print:pb-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hospital Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive reports — Medlink Level B2 Facility</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-slate-500 text-xs font-bold hover:bg-white/60 transition-all"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} /> Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 transition-all"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Total Patients" value={summary.totalPatients.toLocaleString()}
          icon={<Users className="w-4 h-4" />} color="border-teal-500"
          trend="neutral" trendLabel="All registered"
        />
        <StatCard
          title="Total Revenue" value={`₵${summary.totalRevenue.toLocaleString()}`}
          sub={`${summary.paidBills} paid bills`}
          icon={<DollarSign className="w-4 h-4" />} color="border-emerald-500"
          trend="up" trendLabel="Collected"
        />
        <StatCard
          title="Pending Bills" value={`₵${summary.pendingBillsTotal.toLocaleString()}`}
          sub={`${summary.pendingBillsCount} outstanding`}
          icon={<FileText className="w-4 h-4" />} color="border-red-400"
          trend="down" trendLabel="Uncollected"
        />
        <StatCard
          title="Staff" value={summary.totalStaff.toLocaleString()}
          icon={<Stethoscope className="w-4 h-4" />} color="border-indigo-500"
          trend="neutral" trendLabel="All roles"
        />
        <StatCard
          title="Today Appts" value={summary.todayAppts.toLocaleString()}
          icon={<Activity className="w-4 h-4" />} color="border-orange-500"
          trend="neutral" trendLabel="Scheduled"
        />
        <StatCard
          title="Admissions" value={summary.activeAdmissions.toLocaleString()}
          icon={<BedDouble className="w-4 h-4" />} color="border-purple-500"
          trend="neutral" trendLabel="Currently admitted"
        />
      </div>

      {/* ── CCC Alert Banner ── */}
      {summary.missingCccCount > 0 && (
        <div className="mb-8 flex items-center gap-4 bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
          <p className="text-sm font-bold text-orange-800">
            {summary.missingCccCount} NHIS patient{summary.missingCccCount > 1 ? 's' : ''} with unresolved CCC code{summary.missingCccCount > 1 ? 's' : ''} — follow up required.
          </p>
        </div>
      )}

      {/* ── Trend Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Patient Inflow</h3>
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-0.5">New registrations — last 7 days</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="h-64">
            <Line data={visitChartData} options={chartOpts('patients') as any} />
          </div>
        </div>

        <div className="glass p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800">Revenue Collected</h3>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Paid bills — last 7 days</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="h-64">
            <Line data={revenueChartData} options={chartOpts('₵') as any} />
          </div>
        </div>
      </div>

      {/* ── Distribution Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

        {/* Billing Status */}
        <div className="glass p-8 rounded-3xl">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Billing Status</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Pending vs Collected</p>
          <div className="h-52">
            <Bar data={billingChartData} options={{
              ...chartOpts('₵') as any,
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 700 } } },
                y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
              },
            }} />
          </div>
          <div className="mt-4 space-y-2">
            {billingStatus.map((b: any) => (
              <div key={b.status} className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span className={cn('uppercase', b.status === 'paid' ? 'text-teal-600' : 'text-red-500')}>{b.status}</span>
                <span className="text-slate-700">₵{b.total.toLocaleString()} · {b.count} bills</span>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Pipeline */}
        <div className="glass p-8 rounded-3xl flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-800 mb-1 w-full">Patient Pipeline</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 w-full">Current status distribution</p>
          <div className="w-40 h-40 relative">
            <Doughnut data={pipelineChartData} options={doughnutOpts as any} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-800">{patientPipeline.reduce((a: number, p: any) => a + p.count, 0)}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Total</span>
            </div>
          </div>
          <div className="w-full mt-5 space-y-1.5">
            {patientPipeline.map((p: any) => (
              <div key={p.status} className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIPELINE_COLORS[p.status] || '#e2e8f0' }} />
                  {p.status}
                </div>
                <span className="text-slate-700">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Distribution */}
        <div className="glass p-8 rounded-3xl flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-800 mb-1 w-full">Staff Distribution</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 w-full">By role</p>
          <div className="w-40 h-40 relative">
            <Doughnut data={roleChartData} options={doughnutOpts as any} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-800">{summary.totalStaff}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Staff</span>
            </div>
          </div>
          <div className="w-full mt-5 space-y-1.5">
            {roleDistribution.map((r: any, i: number) => (
              <div key={r.role} className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[i] }} />
                  {r.role}
                </div>
                <span className="text-slate-700">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NHIS + Top Diagnoses ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        {/* NHIS Compliance */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-between">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xl shadow-slate-900/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">NHIS Compliance</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">National Health Insurance coverage among registered patients at this Level B2 facility.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {nhisVsPrivate.map((n: any) => (
              <div key={n.type} className={cn('p-4 rounded-2xl text-center', n.type === 'NHIS' ? 'bg-teal-50 border border-teal-100' : 'bg-slate-50 border border-slate-100')}>
                <p className="text-2xl font-black text-slate-800">{n.count}</p>
                <p className={cn('text-[10px] font-black uppercase tracking-widest mt-1', n.type === 'NHIS' ? 'text-teal-600' : 'text-slate-400')}>{n.type}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
              <span>NHIS Coverage Rate</span>
              <span className="text-teal-600">{nhisPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all" style={{ width: `${nhisPercent}%` }} />
            </div>
            {summary.missingCccCount > 0 && (
              <p className="text-[10px] text-orange-600 font-bold mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> {summary.missingCccCount} pending CCC resolution
              </p>
            )}
          </div>
        </div>

        {/* Top Diagnoses */}
        <div className="glass p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Top Diagnoses</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Most frequent illnesses recorded</p>
            </div>
          </div>
          {topDiagnoses.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">No consultation records yet.</p>
          ) : (
            <div className="space-y-3">
              {topDiagnoses.map((d: any, i: number) => {
                const maxCount = topDiagnoses[0].count;
                const pct = Math.round((d.count / maxCount) * 100);
                return (
                  <div key={d.illness}>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="truncate pr-4">{d.illness || 'Unspecified'}</span>
                      <span className="text-slate-400 shrink-0">{d.count} case{d.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Pharmacy Audit Trail ── */}
      <div className="glass rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Audit Trail — Pharmacy Amendments</h2>
            <p className="text-slate-500 text-xs mt-1">Critical modifications made to dispensed prescriptions by pharmacy staff.</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <PharmacyAmendmentLogs />
        </div>
      </div>
    </div>
  );
}

function PharmacyAmendmentLogs() {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stations/pharmacy/amendment-logs', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => { setLogs(d); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-bold italic">Loading audit logs…</div>;
  }

  return (
    <table className="w-full">
      <thead className="bg-slate-50/50">
        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
          <th className="px-8 py-4">Date &amp; Time</th>
          <th className="px-8 py-4">Pharmacist</th>
          <th className="px-8 py-4">Patient</th>
          <th className="px-8 py-4">Amendment</th>
          <th className="px-8 py-4">Reason</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {logs.map(log => (
          <tr key={log.id} className="hover:bg-orange-50/20 transition-all">
            <td className="px-8 py-4 text-[10px] font-bold text-slate-500">
              {format(new Date(log.createdAt), 'dd MMM yyyy • HH:mm')}
            </td>
            <td className="px-8 py-4">
              <p className="text-xs font-bold text-slate-800">{log.pharmacist_name}</p>
              <p className="text-[10px] font-medium text-slate-400">REF: {log.id.substring(0, 8).toUpperCase()}</p>
            </td>
            <td className="px-8 py-4 font-bold text-slate-700 text-xs">{log.patient_name}</td>
            <td className="px-8 py-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase">Modified</span>
                <p className="text-[10px] text-slate-500 font-medium">
                  Rx: {(log.prescription?._id || log.id).toString().substring(0, 8).toUpperCase()}
                </p>
              </div>
            </td>
            <td className="px-8 py-4 text-xs text-slate-600 italic font-medium max-w-xs">
              <span className="line-clamp-2">"{log.reason}"</span>
            </td>
          </tr>
        ))}
        {logs.length === 0 && (
          <tr>
            <td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm font-medium">
              No pharmacy amendments recorded in audit history.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
