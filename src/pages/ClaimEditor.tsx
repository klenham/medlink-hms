import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles, RefreshCcw, Send, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ClaimEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ diagnosis: '', notes: '' });
  const [supportDocs, setSupportDocs] = useState<any[]>([]);

  const loadClaim = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${id}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load claim');
      setClaim(data);
      setForm({ diagnosis: data.diagnosis || '', notes: data.notes || '' });
      setSupportDocs(data.supporting_documents || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load claim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaim();
  }, [id]);

  const updateClaim = async (payload: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setClaim(data.claim || claim);
      toast.success('Claim saved');
    } catch (err: any) {
      toast.error(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await updateClaim({ diagnosis: form.diagnosis, notes: form.notes, supporting_documents: supportDocs });
    await loadClaim();
  };

  const handleValidate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${id}/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validation failed');
      toast.success('Claim validation complete');
      await loadClaim();
    } catch (err: any) {
      toast.error(err?.message || 'Validation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAIReview = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/claims/${id}/ai-review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI review failed');
      setClaim((prev: any) => ({ ...prev, suggested_icd10: data.suggested_icd10, ai_recommendation: data.ai_recommendation }));
      toast.success('AI claim review generated');
    } catch (err: any) {
      toast.error(err?.message || 'AI review failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleStatusAction = async (action: string, body: any = {}) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      await loadClaim();
      toast.success(data.message || 'Action completed');
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleDocument = (index: number) => {
    setSupportDocs((prev) => prev.map((doc, idx) => idx === index ? { ...doc, attached: !doc.attached } : doc));
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-slate-500">Loading claim details…</div>;
  }

  if (!claim) {
    return <div className="h-full flex items-center justify-center text-slate-500">Claim not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/claims')}
          className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" /> Back to claims
        </button>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Claim status</p>
          <p className="text-lg font-bold text-slate-900">{claim.status}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{claim.claim_number}</h1>
              <p className="text-sm text-slate-500 mt-1">Patient: {claim.patient?.name || 'Unknown'} · NHIS {claim.nhis_number || 'N/A'}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">{claim.facility_level}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Diagnosis</p>
              <textarea
                value={form.diagnosis}
                onChange={(e) => setForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                className="mt-3 w-full min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Notes</p>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-3 w-full min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">AI suggestions disclaimer</p>
                <p className="text-xs text-slate-500">AI-generated claim recommendations are advisory only and must be reviewed by qualified clinical staff before submission.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                disabled={saving}
                onClick={handleSave}
                className="rounded-3xl bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 transition"
              >Save changes</button>
              <button
                disabled={saving}
                onClick={handleValidate}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >Re-run validation</button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Claim items</p>
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{(claim.items || []).length} items</span>
            </div>
            <div className="space-y-3">
              {(claim.items || []).map((item: any) => (
                <div key={item._id} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.description}</p>
                      <p className="text-xs text-slate-500">Level: {item.prescribing_level || 'unknown'} · Claimable: {item.claimable ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">GHS {Number(item.amount || 0).toFixed(2)}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  {Array.isArray(item.validation_notes) && item.validation_notes.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
                      <strong>Validation notes:</strong> {item.validation_notes.join(' ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Supporting documents</p>
                <p className="text-xs text-slate-500">Toggle what is attached to the claim.</p>
              </div>
              <button
                disabled={saving}
                onClick={() => setSupportDocs((prev) => prev.map((doc) => ({ ...doc, attached: true })))}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >Mark all attached</button>
            </div>
            <div className="mt-4 space-y-3">
              {supportDocs.map((doc, index) => (
                <button
                  key={`${doc.type}-${index}`}
                  type="button"
                  onClick={() => toggleDocument(index)}
                  className={`w-full rounded-3xl border px-4 py-3 text-left transition ${doc.attached ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{doc.description}</p>
                      <p className="text-xs text-slate-500">{doc.type}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${doc.attached ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                      {doc.attached ? 'Attached' : 'Pending'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">AI claim assistant</p>
                <p className="text-xs text-slate-500">Generate ICD-10 suggestions and approval recommendations.</p>
              </div>
            </div>
            <button
              disabled={aiLoading}
              onClick={handleAIReview}
              className="w-full rounded-3xl bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 transition"
            >{aiLoading ? 'Reviewing…' : 'Run AI claim review'}</button>
            {claim.suggested_icd10?.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">Suggested ICD-10 codes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {claim.suggested_icd10.map((code: string) => (
                    <span key={code} className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{code}</span>
                  ))}
                </div>
              </div>
            )}
            {claim.ai_recommendation && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">AI recommendation</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{claim.ai_recommendation}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-900">Approval actions</p>
            <div className="grid gap-3">
              <button
                disabled={saving || claim.status !== 'draft'}
                onClick={() => handleStatusAction('submit')}
                className="w-full rounded-3xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 transition"
              >Submit claim</button>
              <button
                disabled={saving || claim.status !== 'submitted'}
                onClick={() => handleStatusAction('vet')}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >Mark vetted</button>
              <button
                disabled={saving || claim.status !== 'vetted'}
                onClick={() => handleStatusAction('mark-paid')}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >Mark paid</button>
              <button
                disabled={saving}
                onClick={() => {
                  const note = window.prompt('Reason for rejection', claim.rejection_notes || 'Needs correction');
                  if (note) handleStatusAction('reject', { rejection_notes: note });
                }}
                className="w-full rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
              >Reject claim</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
