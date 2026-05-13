import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, ArrowRight, FileText } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'vetted', label: 'Vetted' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

export default function Claims() {
  const [status, setStatus] = useState('draft');
  const [search, setSearch] = useState('');
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, q: search });
      const res = await fetch(`/api/claims?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const data = await res.json();
      setClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Unable to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [status]);

  const handleSearch = async () => {
    await fetchClaims();
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ status });
      const res = await fetch(`/api/claims/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nhis_claims_${status}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">NHIS Claims</h1>
          <p className="text-sm text-gray-500 mt-1">Track drafts, submissions, vetting, payment, and rejections for NHIS claims.</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-primary-700 transition"
        >
          <Download className="w-4 h-4" /> Export {status} claims
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {STATUS_OPTIONS.map((item) => (
          <button
            key={item.value}
            onClick={() => setStatus(item.value)}
            className={`rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${status === item.value ? 'bg-primary-600 text-white shadow-lg' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          >
            <span className="block text-xs text-slate-400 mb-1">{item.label}</span>
            <span className="text-lg">{claims.filter((c) => c.status === item.value).length || (status === item.value ? claims.length : '')}</span>
          </button>
        ))}
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search claim number, patient name, or diagnosis..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="w-4 h-4" /> Search
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{STATUS_OPTIONS.find((opt) => opt.value === status)?.label} claims</p>
              <h2 className="text-2xl font-bold text-slate-900">{claims.length} claim{claims.length !== 1 ? 's' : ''}</h2>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto p-6">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500 uppercase tracking-[0.16em] text-[11px]">
                <th className="pb-3 pr-4">Claim #</th>
                <th className="pb-3 pr-4">Patient</th>
                <th className="pb-3 pr-4">NHIS No.</th>
                <th className="pb-3 pr-4">Diagnosis</th>
                <th className="pb-3 pr-4">Total</th>
                <th className="pb-3 pr-4">Updated</th>
                <th className="pb-3 pl-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading claims...</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No claims found.</td></tr>
              ) : claims.map((claim) => (
                <tr key={claim.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="py-4 pr-4 text-slate-900 font-medium">{claim.claim_number}</td>
                  <td className="py-4 pr-4">{claim.patient_name || 'Unknown'}</td>
                  <td className="py-4 pr-4">{claim.nhis_number || 'N/A'}</td>
                  <td className="py-4 pr-4 max-w-sm truncate">{claim.diagnosis || 'No diagnosis'}</td>
                  <td className="py-4 pr-4 font-semibold">GHS {Number(claim.total_amount || 0).toFixed(2)}</td>
                  <td className="py-4 pr-4 text-slate-500">{new Date(claim.updatedAt || claim.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 pl-4">
                    <button
                      onClick={() => navigate(`/claims/${claim._id}`)}
                      className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-3 py-2 text-white text-xs font-semibold hover:bg-primary-700 transition"
                    >
                      View <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
